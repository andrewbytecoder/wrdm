package services

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	. "github.com/andrewbytecoder/wrdm/backend/storage"
	"github.com/andrewbytecoder/wrdm/backend/types"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	clientv3 "go.etcd.io/etcd/client/v3"
	"go.etcd.io/etcd/api/v3/mvccpb"
)

// EtcdService provides etcd v3 operations to the frontend.
// It mirrors the old Redis ConnectionService responsibilities, but in etcd semantics.
type EtcdService struct {
	ctx   context.Context
	conns *ConnectionsStorage

	mu      sync.Mutex
	connMap map[string]*etcdConn

	watchMu   sync.Mutex
	watchSeq  int64
	watchCanc map[int64]context.CancelFunc
}

type etcdConn struct {
	cli        *clientv3.Client
	cancelFunc context.CancelFunc
}

var etcdSvc *EtcdService
var onceEtcd sync.Once

func Etcd() *EtcdService {
	if etcdSvc == nil {
		onceEtcd.Do(func() {
			etcdSvc = &EtcdService{
				conns:      NewConnections(),
				connMap:    map[string]*etcdConn{},
				watchCanc:  map[int64]context.CancelFunc{},
				watchSeq:   0,
			}
		})
	}
	return etcdSvc
}

func (e *EtcdService) Start(ctx context.Context) {
	e.ctx = ctx
}

func (e *EtcdService) Stop(ctx context.Context) {
	e.mu.Lock()
	defer e.mu.Unlock()
	for name, item := range e.connMap {
		if item != nil && item.cancelFunc != nil {
			item.cancelFunc()
		}
		if item != nil && item.cli != nil {
			_ = item.cli.Close()
		}
		delete(e.connMap, name)
	}

	e.watchMu.Lock()
	defer e.watchMu.Unlock()
	for id, cancel := range e.watchCanc {
		if cancel != nil {
			cancel()
		}
		delete(e.watchCanc, id)
	}
}

func (e *EtcdService) TestConnection(host string, port int, username, password string) (resp types.JSResp) {
	endpoint := fmt.Sprintf("%s:%d", host, port)
	runtime.LogDebug(e.ctx, "test etcd connection: "+endpoint)
	cfg := clientv3.Config{
		Endpoints:   []string{endpoint},
		DialTimeout: 5 * time.Second,
		Username:    username,
		Password:    password,
	}
	cli, err := clientv3.New(cfg)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	defer cli.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err = cli.Status(ctx, endpoint)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	return
}

// ListConnection lists all saved connections from local profile.
func (e *EtcdService) ListConnection() []types.Connection {
	return e.conns.GetConnections()
}

// GetConnection returns a connection profile by name.
func (e *EtcdService) GetConnection(name string) *types.Connection {
	return e.conns.GetConnection(name)
}

func (e *EtcdService) SaveConnection(name string, param types.Connection) (resp types.JSResp) {
	var err error
	if len(name) > 0 {
		err = e.conns.UpdateConnection(name, param)
	} else {
		err = e.conns.CreateConnection(param)
	}
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	return
}

func (e *EtcdService) SaveSortedConnection(param []types.Connection) error {
	return e.conns.SaveSortedConnections(param)
}

func (e *EtcdService) CreateGroup(name string) (resp types.JSResp) {
	if err := e.conns.CreateGroup(name); err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	return
}

func (e *EtcdService) RenameGroup(oldName, newName string) (resp types.JSResp) {
	if err := e.conns.RenameGroup(oldName, newName); err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	return
}

func (e *EtcdService) DeleteGroup(name string, includeConnection bool) (resp types.JSResp) {
	if err := e.conns.DeleteGroup(name, includeConnection); err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	return
}

func (e *EtcdService) DeleteConnection(name string) (resp types.JSResp) {
	_ = e.CloseConnection(name)
	if err := e.conns.DeleteConnection(name); err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	return
}

func (e *EtcdService) OpenConnection(name string) (resp types.JSResp) {
	cli, endpoint, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 5*time.Second)
	defer cancel()

	st, err := cli.Status(ctx, endpoint)
	if err != nil {
		resp.Msg = err.Error()
		return
	}

	members, err := cli.MemberList(ctx)
	if err != nil {
		resp.Msg = err.Error()
		return
	}

	resp.Success = true
	resp.Data = map[string]any{
		"endpoint": endpoint,
		"status":   st,
		"members":  members.Members,
	}
	return
}

func (e *EtcdService) CloseConnection(name string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	item := e.connMap[name]
	if item == nil {
		return true
	}
	delete(e.connMap, name)
	if item.cancelFunc != nil {
		item.cancelFunc()
	}
	if item.cli != nil {
		_ = item.cli.Close()
	}
	return true
}

type KVItem struct {
	Key          string `json:"key"`
	ValueBase64  string `json:"valueBase64"`
	CreateRev    int64  `json:"createRevision"`
	ModRev       int64  `json:"modRevision"`
	Version      int64  `json:"version"`
	Lease        int64  `json:"lease"`
}

func encodeMVCC(kv *mvccpb.KeyValue) KVItem {
	return KVItem{
		Key:         string(kv.Key),
		ValueBase64: base64.StdEncoding.EncodeToString(kv.Value),
		CreateRev:   kv.CreateRevision,
		ModRev:      kv.ModRevision,
		Version:     kv.Version,
		Lease:       kv.Lease,
	}
}

// ListKeys returns kv metadata (keys only by default) under a prefix.
// If rangeEnd is empty, it will use WithPrefix on prefix.
func (e *EtcdService) ListKeys(name string, prefix string, limit int64, rangeEnd string, keysOnly bool) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	runtime.LogDebug(e.ctx, fmt.Sprintf("ListKeys name=%s prefix=%q limit=%d rangeEnd=%q keysOnly=%v", name, prefix, limit, rangeEnd, keysOnly))
	ctx, cancel := context.WithTimeout(e.ctx, 10*time.Second)
	defer cancel()

	opts := []clientv3.OpOption{
		clientv3.WithSort(clientv3.SortByKey, clientv3.SortAscend),
	}
	if limit > 0 {
		opts = append(opts, clientv3.WithLimit(limit))
	}
	if keysOnly {
		opts = append(opts, clientv3.WithKeysOnly())
	}
	key := prefix
	if rangeEnd != "" {
		opts = append(opts, clientv3.WithRange(rangeEnd))
	} else if key == "" {
		// WithPrefix("") does not cover the whole keyspace as expected.
		// Use FromKey from '\x00' to include all keys.
		key = "\x00"
		opts = append(opts, clientv3.WithFromKey())
	} else {
		opts = append(opts, clientv3.WithPrefix())
	}

	gr, err := cli.Get(ctx, key, opts...)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	runtime.LogDebug(e.ctx, fmt.Sprintf("ListKeys result count=%d more=%v revision=%d", gr.Count, gr.More, gr.Header.Revision))

	items := make([]KVItem, 0, len(gr.Kvs))
	for _, kv := range gr.Kvs {
		items = append(items, encodeMVCC(kv))
	}
	resp.Success = true
	resp.Data = map[string]any{
		"kvs":      items,
		"count":    gr.Count,
		"more":     gr.More,
		"revision": gr.Header.Revision,
	}
	return
}

func (e *EtcdService) GetKV(name string, key string) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 10*time.Second)
	defer cancel()

	gr, err := cli.Get(ctx, key)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	if len(gr.Kvs) == 0 {
		resp.Success = true
		resp.Data = nil
		return
	}
	resp.Success = true
	resp.Data = encodeMVCC(gr.Kvs[0])
	return
}

func (e *EtcdService) PutKV(name string, key string, valueBase64 string, leaseID int64) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	val, err := base64.StdEncoding.DecodeString(valueBase64)
	if err != nil {
		resp.Msg = "invalid base64 value"
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 10*time.Second)
	defer cancel()

	opts := []clientv3.OpOption{}
	if leaseID > 0 {
		opts = append(opts, clientv3.WithLease(clientv3.LeaseID(leaseID)))
	}
	_, err = cli.Put(ctx, key, string(val), opts...)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	return
}

func (e *EtcdService) DeleteKey(name string, key string, withPrefix bool) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 10*time.Second)
	defer cancel()

	opts := []clientv3.OpOption{}
	if withPrefix {
		opts = append(opts, clientv3.WithPrefix())
	}
	dr, err := cli.Delete(ctx, key, opts...)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	resp.Data = map[string]any{"deleted": dr.Deleted}
	return
}

// RenameKey emulates rename by get+put+delete (optionally preserve lease).
func (e *EtcdService) RenameKey(name string, key string, newKey string, preserveLease bool) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 15*time.Second)
	defer cancel()

	gr, err := cli.Get(ctx, key)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	if len(gr.Kvs) == 0 {
		resp.Msg = "key not found"
		return
	}
	kv := gr.Kvs[0]

	var lease clientv3.LeaseID
	if preserveLease {
		lease = clientv3.LeaseID(kv.Lease)
	}
	txn := cli.Txn(ctx).
		If(
			clientv3.Compare(clientv3.Version(key), ">", 0),
			clientv3.Compare(clientv3.Version(newKey), "=", 0),
		).
		Then(
			clientv3.OpPut(newKey, string(kv.Value), clientv3.WithLease(lease)),
			clientv3.OpDelete(key),
		)

	tr, err := txn.Commit()
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	if !tr.Succeeded {
		resp.Msg = "rename failed (source missing or destination exists)"
		return
	}
	resp.Success = true
	return
}

// ---- Watch & Events ----

type WatchEvent struct {
	WatchID   int64  `json:"watchId"`
	Type      string `json:"type"` // PUT/DELETE
	Key       string `json:"key"`
	ValueBase64 string `json:"valueBase64,omitempty"`
	ModRev    int64  `json:"modRevision,omitempty"`
}

func (e *EtcdService) WatchPrefix(name string, prefix string) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	e.watchMu.Lock()
	e.watchSeq++
	id := e.watchSeq
	ctx, cancel := context.WithCancel(e.ctx)
	e.watchCanc[id] = cancel
	e.watchMu.Unlock()

	watchKey := prefix
	var watchOpts []clientv3.OpOption
	watchOpts = append(watchOpts, clientv3.WithPrevKV())
	if watchKey == "" {
		watchKey = "\x00"
		watchOpts = append(watchOpts, clientv3.WithFromKey())
	} else {
		watchOpts = append(watchOpts, clientv3.WithPrefix())
	}

	ch := cli.Watch(ctx, watchKey, watchOpts...)
	go func() {
		for wr := range ch {
			if wr.Err() != nil {
				runtime.EventsEmit(e.ctx, "etcd:watch:error", map[string]any{
					"watchId": id,
					"msg":     wr.Err().Error(),
				})
				continue
			}
			for _, ev := range wr.Events {
				we := WatchEvent{
					WatchID: id,
					Key:     string(ev.Kv.Key),
					ModRev:  ev.Kv.ModRevision,
				}
				switch ev.Type {
				case clientv3.EventTypePut:
					we.Type = "PUT"
					we.ValueBase64 = base64.StdEncoding.EncodeToString(ev.Kv.Value)
				case clientv3.EventTypeDelete:
					we.Type = "DELETE"
				default:
					we.Type = "UNKNOWN"
				}
				runtime.EventsEmit(e.ctx, "etcd:watch", we)
			}
		}
	}()

	resp.Success = true
	resp.Data = map[string]any{"watchId": id}
	return
}

func (e *EtcdService) Unwatch(watchID int64) (resp types.JSResp) {
	e.watchMu.Lock()
	cancel := e.watchCanc[watchID]
	delete(e.watchCanc, watchID)
	e.watchMu.Unlock()
	if cancel != nil {
		cancel()
	}
	resp.Success = true
	return
}

// ---- Lease / TTL ----

func (e *EtcdService) GrantLease(name string, ttl int64) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 10*time.Second)
	defer cancel()
	lr, err := cli.Grant(ctx, ttl)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	resp.Data = map[string]any{"id": int64(lr.ID), "ttl": lr.TTL}
	return
}

func (e *EtcdService) RevokeLease(name string, leaseID int64) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 10*time.Second)
	defer cancel()
	_, err = cli.Revoke(ctx, clientv3.LeaseID(leaseID))
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	return
}

func (e *EtcdService) LeaseTimeToLive(name string, leaseID int64, keys bool) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 10*time.Second)
	defer cancel()
	opts := []clientv3.LeaseOption{}
	if keys {
		opts = append(opts, clientv3.WithAttachedKeys())
	}
	ttlResp, err := cli.TimeToLive(ctx, clientv3.LeaseID(leaseID), opts...)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	resp.Data = ttlResp
	return
}

func (e *EtcdService) KeepAliveLease(name string, leaseID int64) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ch, err := cli.KeepAlive(e.ctx, clientv3.LeaseID(leaseID))
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	go func() {
		for ka := range ch {
			if ka == nil {
				return
			}
			runtime.EventsEmit(e.ctx, "etcd:lease:keepalive", map[string]any{
				"leaseId": int64(ka.ID),
				"ttl":     ka.TTL,
			})
		}
	}()
	resp.Success = true
	return
}

// ---- Txn ----

type TxnCompare struct {
	Key    string `json:"key"`
	Target string `json:"target"` // version|modRevision|value
	Op     string `json:"op"`     // =|!=|>|<|>=|<=
	Value  string `json:"value"`  // string for value compare, or number string
}

type TxnOp struct {
	Type        string `json:"type"` // put|del|get
	Key         string `json:"key"`
	ValueBase64 string `json:"valueBase64,omitempty"`
	WithPrefix  bool   `json:"withPrefix,omitempty"`
	LeaseID     int64  `json:"leaseId,omitempty"`
}

func (e *EtcdService) Txn(name string, compares []TxnCompare, successOps []TxnOp, failOps []TxnOp) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 15*time.Second)
	defer cancel()

	cmps := make([]clientv3.Cmp, 0, len(compares))
	for _, c := range compares {
		op := strings.TrimSpace(c.Op)
		switch c.Target {
		case "version":
			cmps = append(cmps, clientv3.Compare(clientv3.Version(c.Key), op, mustParseInt64(c.Value)))
		case "modRevision":
			cmps = append(cmps, clientv3.Compare(clientv3.ModRevision(c.Key), op, mustParseInt64(c.Value)))
		case "value":
			// value compare as raw string (not base64)
			cmps = append(cmps, clientv3.Compare(clientv3.Value(c.Key), op, c.Value))
		default:
			resp.Msg = "invalid compare target"
			return
		}
	}

	thenOps, err := buildTxnOps(successOps)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	elseOps, err := buildTxnOps(failOps)
	if err != nil {
		resp.Msg = err.Error()
		return
	}

	tr, err := cli.Txn(ctx).If(cmps...).Then(thenOps...).Else(elseOps...).Commit()
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	resp.Success = true
	resp.Data = tr
	return
}

func mustParseInt64(s string) int64 {
	var v int64
	_, _ = fmt.Sscan(s, &v)
	return v
}

func buildTxnOps(ops []TxnOp) ([]clientv3.Op, error) {
	ret := make([]clientv3.Op, 0, len(ops))
	for _, op := range ops {
		switch op.Type {
		case "put":
			val, err := base64.StdEncoding.DecodeString(op.ValueBase64)
			if err != nil {
				return nil, errors.New("invalid base64 value")
			}
			opts := []clientv3.OpOption{}
			if op.LeaseID > 0 {
				opts = append(opts, clientv3.WithLease(clientv3.LeaseID(op.LeaseID)))
			}
			ret = append(ret, clientv3.OpPut(op.Key, string(val), opts...))
		case "del":
			opts := []clientv3.OpOption{}
			if op.WithPrefix {
				opts = append(opts, clientv3.WithPrefix())
			}
			ret = append(ret, clientv3.OpDelete(op.Key, opts...))
		case "get":
			opts := []clientv3.OpOption{}
			if op.WithPrefix {
				opts = append(opts, clientv3.WithPrefix())
			}
			ret = append(ret, clientv3.OpGet(op.Key, opts...))
		default:
			return nil, errors.New("invalid txn op type")
		}
	}
	return ret, nil
}

// ---- Import / Export ----

type ExportItem struct {
	Key         string `json:"key"`
	ValueBase64 string `json:"valueBase64"`
	Lease       int64  `json:"lease,omitempty"`
}

func (e *EtcdService) ExportPrefix(name string, prefix string) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 30*time.Second)
	defer cancel()
	gr, err := cli.Get(ctx, prefix, clientv3.WithPrefix())
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	items := make([]ExportItem, 0, len(gr.Kvs))
	for _, kv := range gr.Kvs {
		items = append(items, ExportItem{
			Key:         string(kv.Key),
			ValueBase64: base64.StdEncoding.EncodeToString(kv.Value),
			Lease:       kv.Lease,
		})
	}
	b, _ := json.Marshal(items)
	resp.Success = true
	resp.Data = map[string]any{
		"json": string(b),
		"count": len(items),
	}
	return
}

func (e *EtcdService) Import(name string, jsonData string, mode string) (resp types.JSResp) {
	cli, _, err := e.getClient(name)
	if err != nil {
		resp.Msg = err.Error()
		return
	}
	var items []ExportItem
	if err := json.Unmarshal([]byte(jsonData), &items); err != nil {
		resp.Msg = "invalid json"
		return
	}
	ctx, cancel := context.WithTimeout(e.ctx, 60*time.Second)
	defer cancel()

	overwrite := strings.ToLower(mode) == "overwrite"
	skipExisting := strings.ToLower(mode) == "skip"

	var imported int
	for _, it := range items {
		val, err := base64.StdEncoding.DecodeString(it.ValueBase64)
		if err != nil {
			resp.Msg = "invalid base64 value"
			return
		}
		if skipExisting {
			gr, err := cli.Get(ctx, it.Key)
			if err != nil {
				resp.Msg = err.Error()
				return
			}
			if len(gr.Kvs) > 0 {
				continue
			}
		}
		if !overwrite {
			// onlyNew: ensure destination empty
			gr, err := cli.Get(ctx, it.Key)
			if err != nil {
				resp.Msg = err.Error()
				return
			}
			if len(gr.Kvs) > 0 {
				continue
			}
		}
		_, err = cli.Put(ctx, it.Key, string(val))
		if err != nil {
			resp.Msg = err.Error()
			return
		}
		imported++
	}
	resp.Success = true
	resp.Data = map[string]any{"imported": imported}
	return
}

// ---- internal ----

func (e *EtcdService) getClient(name string) (*clientv3.Client, string, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if item, ok := e.connMap[name]; ok && item != nil && item.cli != nil {
		// pick first endpoint
		ep := ""
		if len(item.cli.Endpoints()) > 0 {
			ep = item.cli.Endpoints()[0]
		}
		return item.cli, ep, nil
	}
	selConn := e.conns.GetConnection(name)
	if selConn == nil {
		return nil, "", fmt.Errorf("no match connection \"%s\"", name)
	}
	endpoint := fmt.Sprintf("%s:%d", selConn.Addr, selConn.Port)

	cfg := clientv3.Config{
		Endpoints:   []string{endpoint},
		DialTimeout: time.Duration(selConn.ConnTimeout) * time.Second,
		Username:    selConn.UserName,
		Password:    selConn.Password,
	}

	// Optional TLS config if populated (fields will be added to ConnectionConfig).
	if selConn.TLSEnabled {
		tlsCfg, err := buildTLSConfig(selConn)
		if err != nil {
			return nil, "", err
		}
		cfg.TLS = tlsCfg
	}

	cli, err := clientv3.New(cfg)
	if err != nil {
		return nil, "", err
	}
	ctx, cancel := context.WithCancel(e.ctx)
	_ = ctx // reserved for future per-connection ctx usage
	e.connMap[name] = &etcdConn{
		cli:        cli,
		cancelFunc: cancel,
	}
	return cli, endpoint, nil
}

func buildTLSConfig(c *types.Connection) (*tls.Config, error) {
	caBytes, err := os.ReadFile(c.CACertPath)
	if err != nil {
		return nil, err
	}
	certPool := x509.NewCertPool()
	if ok := certPool.AppendCertsFromPEM(caBytes); !ok {
		return nil, errors.New("invalid CA cert")
	}
	tlsCfg := &tls.Config{
		RootCAs:            certPool,
		ServerName:         c.TLSServerName,
		InsecureSkipVerify: c.TLSInsecureSkipVerify,
		MinVersion:         tls.VersionTLS12,
	}
	if strings.TrimSpace(c.ClientCertPath) != "" && strings.TrimSpace(c.ClientKeyPath) != "" {
		cert, err := tls.LoadX509KeyPair(c.ClientCertPath, c.ClientKeyPath)
		if err != nil {
			return nil, err
		}
		tlsCfg.Certificates = []tls.Certificate{cert}
	}
	return tlsCfg, nil
}

