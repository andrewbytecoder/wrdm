package services

import (
	"sort"
	"strings"
	"sync"

	"github.com/adrg/sysfont"
	"github.com/andrewbytecoder/wrdm/backend/storage"
	"github.com/andrewbytecoder/wrdm/backend/types"
	"github.com/andrewbytecoder/wrdm/backend/utils/coll"
)

type preferencesService struct {
	pref *storage.PreferencesStorage
}

var preferences *preferencesService
var oncePreferences sync.Once

func Preferences() *preferencesService {
	if preferences == nil {
		oncePreferences.Do(func() {
			preferences = &preferencesService{
				pref: storage.NewPreferencesStorage(),
			}
		})
	}
	return preferences
}

func (p *preferencesService) GetPreferences() (resp types.JSResp) {
	resp.Data = p.pref.GetPreferences()
	resp.Success = true
	return
}

func (p *preferencesService) SetPreferences(values map[string]any) (resp types.JSResp) {
	err := p.pref.SetPreferencesN(values)
	if err != nil {
		resp.Msg = err.Error()
		return
	}

	resp.Success = true
	return
}

func (p *preferencesService) RestorePreferences() (resp types.JSResp) {
	defaultPref := p.pref.RestoreDefault()
	resp.Data = map[string]any{
		"pref": defaultPref,
	}
	resp.Success = true
	return
}

type FontItem struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

func (p *preferencesService) GetFontList() (resp types.JSResp) {
	finder := sysfont.NewFinder(nil)
	fontSet := coll.NewSet[string]()
	var fontList []FontItem
	for _, font := range finder.List() {
		if len(font.Family) > 0 && !strings.HasPrefix(font.Family, ".") && fontSet.Add(font.Family) {
			fontList = append(fontList, FontItem{
				Name: font.Family,
				Path: font.Filename,
			})
		}
	}
	sort.Slice(fontList, func(i, j int) bool {
		return fontList[i].Name < fontList[j].Name
	})
	resp.Data = map[string]any{
		"fonts": fontList,
	}
	resp.Success = true
	return
}
