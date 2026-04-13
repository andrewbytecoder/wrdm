package types

type ConnectionCategory int

type ConnectionConfig struct {
	Name          string `json:"name" yaml:"name"`
	Group         string `json:"group,omitempty" yaml:"-"`
	Addr          string `json:"addr,omitempty" yaml:"addr,omitempty"`
	Port          int    `json:"port,omitempty" yaml:"port,omitempty"`
	UserName      string `json:"username,omitempty" yaml:"username,omitempty"`
	Password      string `json:"password,omitempty" yaml:"password,omitempty"`
	DefaultFilter string `json:"defaultFilter,omitempty" yaml:"default_filter,omitempty"`
	KeySeparator  string `json:"keySeparator,omitempty" yaml:"key_separator,omitempty"`
	ConnTimeout   int    `json:"connTimeout,omitempty" yaml:"conn_timeout,omitempty"`
	ExecTimeout   int    `json:"execTimeout,omitempty" yaml:"exec_timeout,omitempty"`
	MarkColor     string `json:"markColor,omitempty" yaml:"mark_color,omitempty"`

	// TLS options for etcd (optional)
	TLSEnabled            bool   `json:"tlsEnabled,omitempty" yaml:"tls_enabled,omitempty"`
	CACertPath            string `json:"caCertPath,omitempty" yaml:"ca_cert_path,omitempty"`
	ClientCertPath        string `json:"clientCertPath,omitempty" yaml:"client_cert_path,omitempty"`
	ClientKeyPath         string `json:"clientKeyPath,omitempty" yaml:"client_key_path,omitempty"`
	TLSServerName         string `json:"tlsServerName,omitempty" yaml:"tls_server_name,omitempty"`
	TLSInsecureSkipVerify bool   `json:"tlsInsecureSkipVerify,omitempty" yaml:"tls_insecure_skip_verify,omitempty"`
}

type Connection struct {
	ConnectionConfig `json:",inline" yaml:",inline"`
	Type             string       `json:"type,omitempty" yaml:"type,omitempty"`
	Connections      []Connection `json:"connections,omitempty" yaml:"connections,omitempty"`
}

type ConnectionGroup struct {
	GroupName   string             `json:"groupName" yaml:"group_name"`
	Connections []ConnectionConfig `json:"connections" yaml:"connections"`
}

type ConnectionDB struct {
	Name    string `json:"name" yaml:"name"`
	Keys    int    `json:"keys" yaml:"keys"`
	Expires int    `json:"expires,omitempty" yaml:"expires"`
	AvgTTL  int    `json:"avgTTL,omitempty" yaml:"avg_ttl"`
}
