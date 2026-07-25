<?php

namespace Pterodactyl\BlueprintFramework\Extensions\blueserverproperties;

use Illuminate\Support\Arr;
use Pterodactyl\Models\Server;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Exceptions\Http\Server\FileSizeTooLargeException;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class ServerConfigEditorController extends ClientApiController
{
    private DaemonFileRepository $fileRepository;

    public function __construct(DaemonFileRepository $fileRepository)
    {
        parent::__construct();
        $this->fileRepository = $fileRepository;
    }

    public function fetch(ClientApiRequest $request, Server $server): array
    {
        if (!in_array($server->nest_id, [1])) {
            throw new DisplayException('This feature is only available for Minecraft servers.');
        }
        
        try {
            $fileContent = $this->fileRepository->setServer($server)->getContent('server.properties');
        } catch (DaemonConnectionException|FileSizeTooLargeException $exception) {
            throw new DisplayException('Unable to retrieve server configuration file.');
        }

        $configItems = [];
        $defaultValues = [];

        $lines = explode(PHP_EOL, $fileContent);
        
        foreach ($lines as $line) {
            if (empty($line) || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            $parts = explode('=', $line, 2);
            $configKey = $parts[0];
            $configValue = $parts[1] ?? '';
            
            $inputType = 'text';
            $options = [];

            if ($configKey === 'difficulty') {
                $inputType = 'dropdown';
                $options = ['peaceful', 'easy', 'normal', 'hard'];
            } elseif ($configKey === 'gamemode') {
                $inputType = 'dropdown';
                $options = ['survival', 'creative', 'hardcode', 'adventure', 'spectator'];
            }

            if (in_array($configValue, ['true', 'false'])) {
                $inputType = 'toggle';
            }

            $normalizedKey = str_replace('.', '-', $configKey);
            
            $configItems[] = [
                'name' => $normalizedKey,
                'rawValue' => $configValue,
                'inputType' => $inputType,
                'options' => $options,
            ];

            $defaultValues[$normalizedKey] = ($inputType === 'toggle') 
                ? ($configValue === 'true') 
                : $configValue;
        }

        return [
            'items' => $configItems,
            'defaults' => $defaultValues,
        ];
    }

    public function update(ClientApiRequest $request, Server $server): array
    {
        if (!in_array($server->nest_id, [1])) {
            throw new DisplayException('This feature is only available for Minecraft servers.');
        }
        
        try {
            $fileContent = $this->fileRepository->setServer($server)->getContent('server.properties');
        } catch (DaemonConnectionException|FileSizeTooLargeException $exception) {
            throw new DisplayException('Unable to retrieve server configuration file.');
        }

        $lines = explode(PHP_EOL, $fileContent);
        $updatedValues = $request->input('data', []);

        foreach ($lines as $index => $line) {
            if (empty($line) || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            $parts = explode('=', $line, 2);
            $configKey = $parts[0];
            $normalizedKey = str_replace('.', '-', $configKey);

            $newValue = Arr::get($updatedValues, $normalizedKey, $parts[1] ?? '');
            $lines[$index] = $configKey . '=' . $newValue;
        }

        try {
            $this->fileRepository->setServer($server)->putContent('server.properties', implode(PHP_EOL, $lines));
        } catch (DaemonConnectionException $exception) {
            throw new DisplayException('Failed to update configuration. Please try again.');
        }

        return ['success' => true];
    }
}

