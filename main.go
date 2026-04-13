package main

import (
	"context"
	"embed"

	"github.com/andrewbytecoder/wrdm/backend/services"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()
	//connections := storage.NewConnections()
	connSvc := services.Connection()
	etcdSvc := services.Etcd()

	prefSvc := services.Preferences()
	// Create application with options
	err := wails.Run(&options.App{
		Title:     "wrdm",
		Width:     1024,
		Height:    768,
		MinWidth:  1024,
		MinHeight: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			app.startup(ctx)
		},
		OnShutdown: func(ctx context.Context) {
			etcdSvc.Stop(ctx)
			connSvc.Stop(ctx)
		},
		Bind: []interface{}{
			app,
			// connections
			connSvc,
			etcdSvc,
			prefSvc,
		},
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: false,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            false,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
