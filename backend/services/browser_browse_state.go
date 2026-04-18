package services

import (
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"tinyrdm/backend/types"
	strutil "tinyrdm/backend/utils/string"
)

// Connection type constants (aligned with frontend/src/consts/connection_type.ts)
const (
	connTypeRedisDB    = 2
	connTypeRedisKey   = 3
	connTypeRedisValue = 4
)

const connTypeKeyViewTree = 0
const connTypeKeyViewList = 1

// browseTreeNode mirrors frontend RedisNodeItem fields used by NTree.
type browseTreeNode struct {
	Key          string            `json:"key"`
	Label        string            `json:"label"`
	Name         string            `json:"name,omitempty"`
	Type         int               `json:"type"`
	DB           int               `json:"db"`
	RedisKey     string            `json:"redisKey,omitempty"`
	RedisKeyCode any               `json:"redisKeyCode,omitempty"`
	KeyCount     int               `json:"keyCount"`
	MaxKeys      int               `json:"maxKeys"`
	IsLeaf       bool              `json:"isLeaf"`
	Opened       bool              `json:"opened"`
	Expanded     bool              `json:"expanded"`
	Children     []*browseTreeNode `json:"children"`
	RedisType    string            `json:"redisType,omitempty"`
}

type browseDbInfo struct {
	DB       int    `json:"db"`
	Alias    string `json:"alias"`
	KeyCount int    `json:"keyCount"`
	MaxKeys  int    `json:"maxKeys"`
}

// browseServerState holds key tree / list state for one Redis connection (frontend RedisServerState).
type browseServerState struct {
	mu sync.Mutex

	Name    string
	DB      int
	Version string

	ReloadKey int64

	Separator string
	ViewType  int

	PatternFilter *string
	TypeFilter    *string
	ExactFilter   bool

	Databases map[int]*browseDbInfo

	NodeMap map[string]*browseTreeNode

	Stats map[string]any

	FullLoaded bool

	decodeHistory      map[string][2]string
	decodeHistoryLimit int
}

type browseStateManager struct {
	mu      sync.Mutex
	servers map[string]*browseServerState
}

var browseStates = &browseStateManager{servers: map[string]*browseServerState{}}

func (m *browseStateManager) deleteServer(name string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.servers, name)
}

func (m *browseStateManager) getOrCreate(name string) *browseServerState {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.servers[name]; ok {
		return s
	}
	s := &browseServerState{
		Name:               name,
		DB:                 -1,
		Databases:          map[int]*browseDbInfo{},
		NodeMap:            map[string]*browseTreeNode{},
		Stats:              map[string]any{},
		decodeHistory:      map[string][2]string{},
		decodeHistoryLimit: 100,
		ReloadKey:          time.Now().UnixMilli(),
		Separator:          ":",
		ViewType:           connTypeKeyViewTree,
	}
	m.servers[name] = s
	return s
}

func (m *browseStateManager) get(name string) *browseServerState {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.servers[name]
}

// --- init from OpenConnection ---

func browseInitFromOpen(name string, selConn *types.Connection, dbs []types.ConnectionDB, version string, lastDB int) {
	st := browseStates.getOrCreate(name)
	st.mu.Lock()
	defer st.mu.Unlock()

	st.Version = version
	st.ViewType = selConn.KeyView
	if st.ViewType != connTypeKeyViewList {
		st.ViewType = connTypeKeyViewTree
	}
	sep := strings.TrimSpace(selConn.KeySeparator)
	if sep == "" {
		sep = ":"
	}
	st.Separator = sep

	st.Databases = map[int]*browseDbInfo{}
	defaultDB := -1
	for _, dbItem := range dbs {
		alias := dbItem.Alias
		st.Databases[dbItem.Index] = &browseDbInfo{
			DB:       dbItem.Index,
			Alias:    alias,
			KeyCount: 0,
			MaxKeys:  dbItem.MaxKeys,
		}
		if dbItem.Index == lastDB {
			defaultDB = dbItem.Index
		} else if defaultDB < 0 {
			defaultDB = dbItem.Index
		}
	}
	st.DB = defaultDB

	pat := selConn.DefaultFilter
	st.PatternFilter = &pat
	emptyType := ""
	st.TypeFilter = &emptyType
	st.ExactFilter = false

	st.NodeMap = map[string]*browseTreeNode{}
	st.FullLoaded = false
	st.ReloadKey = time.Now().UnixMilli()
}

// --- open database ---

func browseOnOpenDatabase(server string, db int, maxKeys int64) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()

	st.DB = db
	if st.Databases[db] == nil {
		st.Databases[db] = &browseDbInfo{DB: db, KeyCount: 0, MaxKeys: int(maxKeys)}
	} else {
		st.Databases[db].MaxKeys = int(maxKeys)
	}
	st.NodeMap = map[string]*browseTreeNode{}
	st.ensureRootLocked()
	st.FullLoaded = false
	st.ReloadKey = time.Now().UnixMilli()
}

// --- load keys merge ---

func browseAfterLoadKeys(server string, db int, keys []any, maxKeys int64, scanEnd bool) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()

	if st.Databases[db] == nil {
		st.Databases[db] = &browseDbInfo{DB: db, KeyCount: 0, MaxKeys: int(maxKeys)}
	} else {
		st.Databases[db].MaxKeys = int(maxKeys)
	}
	st.ensureRootLocked()
	if len(keys) == 0 {
		// Only reset the tree when the scan finished; an empty page mid-scan must not wipe state.
		if scanEnd {
			st.NodeMap = map[string]*browseTreeNode{}
			st.ensureRootLocked()
		}
	} else {
		st.addKeyNodesLocked(keys, false)
	}
	st.tidyNodeLocked("")
	if scanEnd {
		st.FullLoaded = true
	}
	st.ReloadKey = time.Now().UnixMilli()
}

func browseAfterLoadAllKeys(server string, db int, keys []any, maxKeys int64) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()

	if st.Databases[db] == nil {
		st.Databases[db] = &browseDbInfo{DB: db, KeyCount: 0, MaxKeys: int(maxKeys)}
	} else {
		st.Databases[db].MaxKeys = int(maxKeys)
	}
	st.ensureRootLocked()
	st.addKeyNodesLocked(keys, false)
	st.tidyNodeLocked("")
	st.FullLoaded = true
	st.ReloadKey = time.Now().UnixMilli()
}

// --- mutations from delete / rename ---

func browseRemoveKeys(server string, db int, keys []string) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.DB != db {
		return
	}
	for _, k := range keys {
		st.removeKeyNodeLocked(k, false)
	}
	st.tidyNodeLocked("")
	st.ReloadKey = time.Now().UnixMilli()
}

func browseRemoveKeyPrefix(server string, db int, prefix string) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.DB != db {
		return
	}
	st.removeKeyNodeLocked(prefix, true)
	st.ReloadKey = time.Now().UnixMilli()
}

func browseRenameKey(server string, db int, oldKey, newKey string) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.DB != db {
		return
	}
	st.renameKeyLocked(oldKey, newKey)
	st.ReloadKey = time.Now().UnixMilli()
}

func browseClearAllKeys(server string, db int) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.Databases[db] != nil {
		st.Databases[db].KeyCount = 0
		st.Databases[db].MaxKeys = 0
	}
	st.NodeMap = map[string]*browseTreeNode{}
	st.ensureRootLocked()
	st.ReloadKey = time.Now().UnixMilli()
}

func browseAddKeys(server string, db int, keys []any) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.DB != db {
		return
	}
	if st.Databases[db] == nil {
		st.Databases[db] = &browseDbInfo{DB: db, KeyCount: 0, MaxKeys: 0}
	}
	st.ensureRootLocked()
	st.addKeyNodesLocked(keys, true)
	st.tidyNodeLocked("")
	st.ReloadKey = time.Now().UnixMilli()
}

// browseReloadKeyLayer removes an existing prefix subtree then merges scan results (reload folder in UI).
func browseReloadKeyLayer(server string, db int, prefix string, keys []any, maxKeys int64) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.DB != db {
		return
	}
	if st.Databases[db] == nil {
		st.Databases[db] = &browseDbInfo{DB: db, KeyCount: 0, MaxKeys: int(maxKeys)}
	} else {
		st.Databases[db].MaxKeys = int(maxKeys)
	}
	st.removeKeyNodeLocked(prefix, true)
	st.ensureRootLocked()
	st.addKeyNodesLocked(keys, false)
	st.tidyNodeLocked(prefix)
	st.ReloadKey = time.Now().UnixMilli()
}

func browseSetKeyFilter(server string, pattern, keyType string, exact bool) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	p := pattern
	st.PatternFilter = &p
	t := keyType
	st.TypeFilter = &t
	st.ExactFilter = exact
	st.ReloadKey = time.Now().UnixMilli()
}

func browseSetStatsFromParsed(server string, parsed map[string]map[string]string) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	out := map[string]any{}
	for k, v := range parsed {
		inner := map[string]any{}
		for ik, iv := range v {
			inner[ik] = iv
		}
		out[k] = inner
	}
	st.Stats = out
}

func browseSetStats(server string, stats map[string]any) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	st.Stats = stats
}

func browseSetNodeRedisType(server string, nativeKey string, keyType string) {
	st := browseStates.get(server)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	nodeKey := strconv.Itoa(connTypeRedisValue) + "/" + nativeKey
	if n, ok := st.NodeMap[nodeKey]; ok {
		n.RedisType = keyType
	}
}

// --- snapshot ---

func browseSnapshotJSON(server string, db int) map[string]any {
	st := browseStates.get(server)
	if st == nil {
		return map[string]any{
			"db":            db,
			"keyStruct":     []any{},
			"reloadKey":     0,
			"viewType":      connTypeKeyViewTree,
			"filter":        map[string]any{"match": "", "type": "", "exact": false},
			"databases":     []any{},
			"version":       "",
			"separator":     ":",
			"loadingState":  map[string]any{"fullLoaded": false},
			"decodeHistory": map[string]any{},
		}
	}
	st.mu.Lock()
	defer st.mu.Unlock()

	root := st.getRootLocked()
	var children []any
	for _, ch := range root.Children {
		children = append(children, browseNodeToMap(ch))
	}
	dbList := make([]any, 0, len(st.Databases))
	keys := make([]int, 0, len(st.Databases))
	for idx := range st.Databases {
		keys = append(keys, idx)
	}
	sort.Ints(keys)
	for _, idx := range keys {
		di := st.Databases[idx]
		dbList = append(dbList, map[string]any{
			"db":       di.DB,
			"alias":    di.Alias,
			"keyCount": di.KeyCount,
			"maxKeys":  di.MaxKeys,
		})
	}
	match := ""
	if st.PatternFilter != nil {
		match = *st.PatternFilter
	}
	kt := ""
	if st.TypeFilter != nil {
		kt = *st.TypeFilter
	}
	return map[string]any{
		"db":           st.DB,
		"keyStruct":    children,
		"reloadKey":    st.ReloadKey,
		"viewType":     st.ViewType,
		"filter":       map[string]any{"match": match, "type": kt, "exact": st.ExactFilter},
		"databases":    dbList,
		"version":      st.Version,
		"separator":    st.Separator,
		"stats":        st.Stats,
		"loadingState": map[string]any{"fullLoaded": st.FullLoaded},
	}
}

func browseNodeToMap(n *browseTreeNode) map[string]any {
	if n == nil {
		return nil
	}
	out := map[string]any{
		"key":       n.Key,
		"label":     n.Label,
		"name":      n.Name,
		"type":      n.Type,
		"db":        n.DB,
		"redisKey":  n.RedisKey,
		"keyCount":  n.KeyCount,
		"maxKeys":   n.MaxKeys,
		"isLeaf":    n.IsLeaf,
		"opened":    n.Opened,
		"expanded":  n.Expanded,
		"redisType": n.RedisType,
	}
	if n.RedisKeyCode != nil {
		out["redisKeyCode"] = n.RedisKeyCode
	}
	if len(n.Children) > 0 {
		ch := make([]any, 0, len(n.Children))
		for _, c := range n.Children {
			ch = append(ch, browseNodeToMap(c))
		}
		out["children"] = ch
	} else {
		out["children"] = []any{}
	}
	return out
}

// --- internal tree logic (ported from frontend RedisServerState) ---

func (s *browseServerState) ensureRootLocked() {
	rootKey := strconv.Itoa(connTypeRedisDB)
	if _, ok := s.NodeMap[rootKey]; !ok {
		s.NodeMap[rootKey] = &browseTreeNode{
			Key:      rootKey,
			Label:    "db" + strconv.Itoa(s.DB),
			Type:     connTypeRedisDB,
			DB:       s.DB,
			Children: []*browseTreeNode{},
		}
	} else {
		s.NodeMap[rootKey].Label = "db" + strconv.Itoa(s.DB)
		s.NodeMap[rootKey].DB = s.DB
		if s.NodeMap[rootKey].Children == nil {
			s.NodeMap[rootKey].Children = []*browseTreeNode{}
		}
	}
}

func (s *browseServerState) getRootLocked() *browseTreeNode {
	s.ensureRootLocked()
	return s.NodeMap[strconv.Itoa(connTypeRedisDB)]
}

func decodeKeyAny(key any) string {
	return strutil.DecodeRedisKey(key)
}

func nativeKeyAny(key any) string {
	switch key.(type) {
	case string:
		return key.(string)
	case []any:
		arr := key.([]any)
		b := make([]byte, len(arr))
		for i, v := range arr {
			if iv, ok := strutil.AnyToInt(v); ok {
				b[i] = byte(iv)
			}
		}
		return string(b)
	case []int:
		arr := key.([]int)
		b := make([]byte, len(arr))
		for i, v := range arr {
			b[i] = byte(v)
		}
		return string(b)
	default:
		return strutil.DecodeRedisKey(key)
	}
}

func (s *browseServerState) addKeyNodesLocked(keys []any, sortInsert bool) {
	root := s.getRootLocked()
	if s.ViewType == connTypeKeyViewList {
		cmp := func(a, b *browseTreeNode) int { return s.sortingCompare(a, b) }
		for _, key := range keys {
			k := decodeKeyAny(key)
			isBinary := k != nativeKeyAny(key)
			nodeKey := strconv.Itoa(connTypeRedisValue) + "/" + nativeKeyAny(key)
			_, existed := s.NodeMap[nodeKey]
			sel := &browseTreeNode{
				Key:          s.Name + "/db" + strconv.Itoa(s.DB) + "#" + nodeKey,
				Label:        k,
				DB:           s.DB,
				KeyCount:     0,
				RedisKey:     k,
				Type:         connTypeRedisValue,
				IsLeaf:       true,
				RedisKeyCode: nil,
			}
			if isBinary {
				sel.RedisKeyCode = key
			}
			s.NodeMap[nodeKey] = sel
			if !existed {
				root.addChild(sel, sortInsert, cmp)
			}
		}
		return
	}
	// tree view
	cmp := func(a, b *browseTreeNode) int { return s.sortingCompare(a, b) }
	for _, key := range keys {
		k := decodeKeyAny(key)
		isBinary := k != nativeKeyAny(key)
		var keyParts []string
		if isBinary {
			keyParts = []string{nativeKeyAny(key)}
		} else {
			keyParts = strings.Split(k, s.Separator)
		}
		handlePath := ""
		node := root
		lastIdx := len(keyParts) - 1
		for i := 0; i < len(keyParts); i++ {
			handlePath += keyParts[i]
			if i != lastIdx {
				nodeKey := strconv.Itoa(connTypeRedisKey) + "/" + handlePath
				selected := s.NodeMap[nodeKey]
				if selected == nil {
					selected = &browseTreeNode{
						Key:      s.Name + "/db" + strconv.Itoa(s.DB) + "#" + nodeKey,
						Label:    keyParts[i],
						DB:       s.DB,
						KeyCount: 0,
						RedisKey: handlePath,
						Type:     connTypeRedisKey,
						IsLeaf:   false,
						Children: []*browseTreeNode{},
					}
					s.NodeMap[nodeKey] = selected
					node.addChild(selected, sortInsert, cmp)
				}
				node = selected
				handlePath += s.Separator
			} else {
				nodeKey := strconv.Itoa(connTypeRedisValue) + "/" + handlePath
				_, existed := s.NodeMap[nodeKey]
				label := keyParts[i]
				if isBinary {
					label = k
				}
				sel := &browseTreeNode{
					Key:          s.Name + "/db" + strconv.Itoa(s.DB) + "#" + nodeKey,
					Label:        label,
					DB:           s.DB,
					KeyCount:     0,
					RedisKey:     handlePath,
					Type:         connTypeRedisValue,
					IsLeaf:       true,
					RedisKeyCode: nil,
				}
				if isBinary {
					sel.RedisKeyCode = key
				}
				s.NodeMap[nodeKey] = sel
				if !existed {
					node.addChild(sel, sortInsert, cmp)
				}
			}
		}
	}
}

func (s *browseServerState) tidyNodeLocked(key string) {
	rootNode := s.getRootLocked()
	keyParts := strings.Split(key, s.Separator)
	totalParts := len(keyParts)
	var node *browseTreeNode
	i := totalParts - 1
	for ; i > 0; i-- {
		parentKey := strings.Join(keyParts[:i], s.Separator)
		mapKey := strconv.Itoa(connTypeRedisKey) + "/" + parentKey
		node = s.NodeMap[mapKey]
		if node != nil {
			break
		}
	}
	if node == nil {
		node = rootNode
	}
	keyCountUpdated := node.tidy(false, s.sortingCompare)
	if keyCountUpdated {
		for ; i > 0; i-- {
			parentKey := strings.Join(keyParts[:i], s.Separator)
			mapKey := strconv.Itoa(connTypeRedisKey) + "/" + parentKey
			parentNode := s.NodeMap[mapKey]
			if parentNode == nil {
				break
			}
			count := parentNode.reCalcKeyCount()
			if count <= 0 {
				var anceKeyNode = rootNode
				if i > 1 {
					anceKey := strings.Join(keyParts[:i-1], s.Separator)
					anceKeyNode = s.NodeMap[strconv.Itoa(connTypeRedisKey)+"/"+anceKey]
				}
				if anceKeyNode != nil {
					anceKeyNode.removeChildPred(connTypeRedisKey, parentKey)
				}
			}
		}
		if dbInst := s.Databases[s.DB]; dbInst != nil {
			dbInst.KeyCount = rootNode.reCalcKeyCount()
		}
	}
}

func (s *browseServerState) removeKeyNodeLocked(key string, isLayer bool) {
	if isLayer {
		s.deleteChildrenKeyNodesLocked(key)
	} else {
		nodeKey := strconv.Itoa(connTypeRedisValue) + "/" + key
		delete(s.NodeMap, nodeKey)
	}
	dbRoot := s.getRootLocked()
	if key == "" {
		s.NodeMap = map[string]*browseTreeNode{}
		s.ensureRootLocked()
		if dbInst := s.Databases[s.DB]; dbInst != nil {
			dbInst.MaxKeys = 0
			dbInst.KeyCount = 0
		}
		return
	}
	keyParts := strings.Split(key, s.Separator)
	totalParts := len(keyParts)
	parentKey := keyParts[:max(0, totalParts-1)]
	var parentNode *browseTreeNode
	if len(parentKey) == 0 {
		parentNode = dbRoot
	} else {
		pk := strings.Join(parentKey, s.Separator)
		parentNode = s.NodeMap[strconv.Itoa(connTypeRedisKey)+"/"+pk]
	}
	if parentNode == nil {
		return
	}
	rmType := connTypeRedisValue
	if isLayer {
		rmType = connTypeRedisKey
	}
	parentNode.removeChildPred(rmType, key)
}

func (s *browseServerState) deleteChildrenKeyNodesLocked(key string) {
	if key == "" {
		s.NodeMap = map[string]*browseTreeNode{}
		s.ensureRootLocked()
		return
	}
	nodeKey := strconv.Itoa(connTypeRedisKey) + "/" + key
	node := s.NodeMap[nodeKey]
	if node == nil || node.Children == nil {
		return
	}
	children := append([]*browseTreeNode(nil), node.Children...)
	for _, child := range children {
		if child.Type == connTypeRedisValue {
			delete(s.NodeMap, strconv.Itoa(connTypeRedisValue)+"/"+child.RedisKey)
		} else if child.Type == connTypeRedisKey {
			s.deleteChildrenKeyNodesLocked(child.RedisKey)
		}
	}
	delete(s.NodeMap, nodeKey)
}

func parentKeyParts(parts []string) []string {
	if len(parts) <= 1 {
		return []string{}
	}
	return parts[:len(parts)-1]
}

func (s *browseServerState) renameKeyLocked(oldKey, newKey string) {
	oldLayer := strings.Join(parentKeyParts(strings.Split(oldKey, s.Separator)), s.Separator)
	newLayer := strings.Join(parentKeyParts(strings.Split(newKey, s.Separator)), s.Separator)
	if oldLayer != newLayer {
		s.removeKeyNodeLocked(oldKey, false)
		s.addKeyNodesLocked([]any{newKey}, true)
		s.tidyNodeLocked(newLayer)
		return
	}
	oldNodeKeyName := strconv.Itoa(connTypeRedisValue) + "/" + oldKey
	newNodeKeyName := strconv.Itoa(connTypeRedisValue) + "/" + newKey
	keyNode := s.NodeMap[oldNodeKeyName]
	if keyNode == nil {
		return
	}
	keyNode.Key = s.Name + "/db" + strconv.Itoa(s.DB) + "#" + newNodeKeyName
	if s.ViewType == connTypeKeyViewTree {
		parts := strings.Split(newKey, s.Separator)
		keyNode.Label = parts[len(parts)-1]
	} else {
		keyNode.Label = newKey
	}
	keyNode.RedisKey = newKey
	s.NodeMap[newNodeKeyName] = keyNode
	delete(s.NodeMap, oldNodeKeyName)
}

func (n *browseTreeNode) addChild(child *browseTreeNode, sorted bool, cmp func(a, b *browseTreeNode) int) {
	if n.Children == nil {
		n.Children = []*browseTreeNode{}
	}
	if !sorted {
		n.Children = append(n.Children, child)
		return
	}
	idx := sortedIndex(n.Children, child, cmp)
	n.Children = append(n.Children[:idx], append([]*browseTreeNode{child}, n.Children[idx:]...)...)
}

func sortedIndex(arr []*browseTreeNode, item *browseTreeNode, cmp func(a, b *browseTreeNode) int) int {
	for i := 0; i < len(arr); i++ {
		r := cmp(arr[i], item)
		if r > 0 {
			return i
		} else if r == 0 {
			return i + 1
		}
	}
	return len(arr)
}

func (s *browseServerState) sortingCompare(a, b *browseTreeNode) int {
	if a.Type != b.Type {
		return a.Type - b.Type
	}
	na, errA := strconv.Atoi(a.Label)
	nb, errB := strconv.Atoi(b.Label)
	if errA == nil && errB == nil {
		return na - nb
	}
	if errA == nil {
		return -1
	}
	if errB == nil {
		return 1
	}
	return strings.Compare(a.Label, b.Label)
}

func (n *browseTreeNode) tidy(skipSort bool, cmp func(a, b *browseTreeNode) int) bool {
	if n.Type == connTypeRedisValue {
		n.KeyCount = 1
		return false
	}
	if n.Type == connTypeRedisKey || n.Type == connTypeRedisDB {
		keyCount := 0
		if len(n.Children) > 0 {
			if !skipSort {
				sort.SliceStable(n.Children, func(i, j int) bool {
					return cmp(n.Children[i], n.Children[j]) < 0
				})
			}
			for _, ch := range n.Children {
				ch.tidy(skipSort, cmp)
				keyCount += ch.KeyCount
			}
		}
		if n.KeyCount != keyCount {
			n.KeyCount = keyCount
			return true
		}
	}
	return false
}

func (n *browseTreeNode) reCalcKeyCount() int {
	if n.Type == connTypeRedisValue {
		n.KeyCount = 1
		return n.KeyCount
	}
	sum := 0
	for _, c := range n.Children {
		sum += c.reCalcKeyCount()
	}
	n.KeyCount = sum
	return n.KeyCount
}

func (n *browseTreeNode) removeChildPred(rmType int, redisKey string) int {
	if n.Children == nil {
		return 0
	}
	removed := 0
	out := n.Children[:0]
	for _, ch := range n.Children {
		if ch.Type == rmType && ch.RedisKey == redisKey {
			removed++
			continue
		}
		out = append(out, ch)
	}
	n.Children = out
	return removed
}
