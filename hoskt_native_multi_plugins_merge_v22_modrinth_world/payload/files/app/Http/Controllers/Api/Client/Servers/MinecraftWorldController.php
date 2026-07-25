<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Jobs\InstallMinecraftMapJob;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\Server;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Services\Minecraft\Maps\CurseForgeMapService;
use Pterodactyl\Services\Minecraft\Maps\MapProvider;
use Pterodactyl\Services\Minecraft\Maps\ModrinthMapService;

class MinecraftWorldController extends ClientApiController
{
    public function __construct(private DaemonFileRepository $daemonFileRepository)
    {
        parent::__construct();
    }

    /**
     * Returns potential worlds in the server root directory.
     */
    public function index(Request $request, Server $server): array
    {
        if (!$request->user()->can(Permission::ACTION_FILE_READ, $server)) {
            throw new AuthorizationException();
        }

        $this->daemonFileRepository->setServer($server);
        $worlds = [];

        foreach ($this->daemonFileRepository->getDirectory('/') as $item) {
            if (!$this->isDirectory($item)) {
                continue;
            }

            $name = (string) ($item['name'] ?? '');
            if ($name === '' || str_starts_with($name, '.hoskt-world-install-')) {
                continue;
            }

            $isWorld = false;
            $isDefaultable = false;

            try {
                foreach ($this->daemonFileRepository->getDirectory($name) as $directoryItem) {
                    $childName = (string) ($directoryItem['name'] ?? '');
                    if ($childName === 'region' && $this->isDirectory($directoryItem)) {
                        $isDefaultable = true;
                    }

                    if ($childName === 'level.dat' || $childName === 'uid.dat') {
                        $isWorld = true;
                    }
                }
            } catch (\Throwable) {
                continue;
            }

            if ($isWorld) {
                $worlds[] = [
                    'name' => $name,
                    'defaultable' => $isDefaultable,
                ];
            }
        }

        usort($worlds, static fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));

        return [
            'worlds' => $worlds,
            'defaultWorld' => $this->getDefaultWorldName(),
        ];
    }

    /**
     * Returns a list of maps from a provider.
     */
    public function maps(
        Request $request,
        Server $server,
        CurseForgeMapService $curseForgeMapService,
        ModrinthMapService $modrinthMapService
    ): array {
        if (!$request->user()->can(Permission::ACTION_FILE_READ, $server)) {
            throw new AuthorizationException();
        }

        $validated = $request->validate([
            'provider' => ['required', Rule::enum(MapProvider::class)],
            'search_query' => 'nullable|string|max:150',
            'page_size' => 'required|numeric|integer|min:1|max:50',
            'page' => 'required|numeric|integer|min:1',
        ]);

        $provider = MapProvider::from($validated['provider']);
        $query = $validated['search_query'] ?? '';
        $pageSize = (int) $validated['page_size'];
        $page = (int) $validated['page'];

        try {
            $data = match ($provider) {
                MapProvider::CurseForge => $curseForgeMapService->search($query, $pageSize, $page),
                MapProvider::Modrinth => $modrinthMapService->search($query, $pageSize, $page),
            };
        } catch (\RuntimeException $exception) {
            throw ValidationException::withMessages([
                'provider' => [$exception->getMessage()],
            ]);
        }

        $maps = is_array($data['data'] ?? null) ? $data['data'] : [];
        $total = max(0, (int) ($data['total'] ?? count($maps)));

        return [
            'object' => 'list',
            'data' => $maps,
            'meta' => [
                'pagination' => [
                    'total' => $total,
                    'count' => count($maps),
                    'per_page' => $pageSize,
                    'current_page' => $page,
                    'total_pages' => max(1, (int) ceil($total / $pageSize)),
                    'links' => [],
                ],
            ],
        ];
    }

    /**
     * Install a remote map using the queue worker.
     */
    public function installMap(Request $request, Server $server)
    {
        if (!$request->user()->can(Permission::ACTION_FILE_CREATE, $server)) {
            throw new AuthorizationException();
        }

        $validated = $request->validate([
            'provider' => ['required', Rule::enum(MapProvider::class)],
            'mapId' => 'required|string|max:191',
        ]);

        InstallMinecraftMapJob::dispatch(
            $server,
            MapProvider::from($validated['provider']),
            $validated['mapId']
        );

        return response()->noContent();
    }

    /**
     * Make a map the default that is loaded upon server start.
     */
    public function makeDefault(Request $request, Server $server)
    {
        if (!$request->user()->can(Permission::ACTION_FILE_UPDATE, $server)) {
            throw new AuthorizationException();
        }

        $validated = $request->validate([
            'worldName' => [
                'required',
                'string',
                'max:191',
                static function ($attribute, $value, $fail): void {
                    if (strpbrk((string) $value, "\r\n/\\") !== false) {
                        $fail('The world name contains an invalid path character.');
                    }
                },
            ],
        ]);

        $this->daemonFileRepository->setServer($server);
        $this->setDefaultWorldName($validated['worldName']);

        return response()->noContent();
    }

    protected function getDefaultWorldName(): ?string
    {
        try {
            $properties = $this->daemonFileRepository->getContent('server.properties');
            if (preg_match('/^level-name=(.*)$/m', $properties, $matches)) {
                return rtrim($matches[1], "\r");
            }
        } catch (\Throwable) {
        }

        return null;
    }

    protected function setDefaultWorldName(string $newName): void
    {
        try {
            $properties = $this->daemonFileRepository->getContent('server.properties');
        } catch (\Throwable) {
            $properties = '';
        }

        if (preg_match('/^level-name=.*$/m', $properties)) {
            $newProperties = preg_replace_callback(
                '/^level-name=.*$/m',
                static fn (): string => 'level-name=' . $newName,
                $properties
            ) ?? $properties;
        } else {
            $newProperties = rtrim($properties) . ($properties === '' ? '' : "\n") . 'level-name=' . $newName . "\n";
        }

        $this->daemonFileRepository->putContent('server.properties', $newProperties);
    }

    private function isDirectory(array $item): bool
    {
        if (array_key_exists('directory', $item)) {
            return (bool) $item['directory'];
        }
        if (array_key_exists('is_file', $item)) {
            return !(bool) $item['is_file'];
        }

        return str_starts_with((string) ($item['mode'] ?? ''), 'd');
    }
}
