<?php

namespace Pterodactyl\BlueprintFramework\Extensions\blueserverproperties;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SettingsController extends Controller
{
    private function getConfigPath(): string
    {
        return storage_path('app/blueserverproperties_config.json');
    }

    public function getNavButtonText()
    {
        if (!file_exists($this->getConfigPath())) {
            return response()->json(['text' => 'Server Properties']);
        }
        
        $config = json_decode(file_get_contents($this->getConfigPath()), true);
        $text = $config['navbar_text'] ?? 'Server Properties';
        
        return response()->json(['text' => $text]);
    }
}

