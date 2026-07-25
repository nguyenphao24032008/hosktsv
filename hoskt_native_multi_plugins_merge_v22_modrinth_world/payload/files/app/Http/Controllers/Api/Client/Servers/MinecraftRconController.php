<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Support\Str;
use Pterodactyl\Models\Server;
use Illuminate\Validation\Rule;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Services\Servers\BuildModificationService;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Exceptions\Http\Server\FileSizeTooLargeException;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;
use Pterodactyl\Http\Requests\Api\Client\Servers\Settings\MinecraftRconRequest;

class MinecraftRconController extends ClientApiController
{
    /**
     * @var int
     */
    private static $minRconPort = 0;

    /**
     * @var int
     */
    private static $maxRconPort = 99999;

    /**
     * @param DaemonFileRepository $daemonFileRepository
     * @param BuildModificationService $buildModificationService
     */
    public function __construct(private DaemonFileRepository $daemonFileRepository, private BuildModificationService $buildModificationService)
    {
        parent::__construct();
    }

    /**
     * @param MinecraftRconRequest $request
     * @param Server $server
     * @return array|array[]
     * @throws DisplayException
     */
    public function load(MinecraftRconRequest $request, Server $server)
    {
        return $this->loadProperties($server);
    }

    /**
     * @param MinecraftRconRequest $request
     * @param Server $server
     * @return array|array[]
     * @throws DisplayException
     */
    public function toggle(MinecraftRconRequest $request, Server $server)
    {
        $this->validate($request, [
            'type' => ['required', 'string', Rule::in(['rcon', 'query'])],
        ]);

        $properties = $this->loadProperties($server);

        if ($request->input('type') == 'rcon') {
            $password = Str::random(10);

            // Always delete old allocation
            $allocation = $server->allocations->toQuery()->where('port', '=', $server->rcon_port)->first();
            if ($allocation) {
                try {
                    $this->updateAllocations($server, [], [$allocation->id]);
                } catch (DisplayException|\Throwable $e) {
                    throw new DisplayException('Failed to remove the RCON port. Make sure it is not the primary port.');
                }

                $allocation->update(['notes' => null]);
                $server->update(['rcon_port' => null]);
            }

            // Generate the new port if needed
            if (!$properties['rcon']['enabled']) {
                // Pick random allocation and assign it
                $allocation = Allocation::where('node_id', '=', $server->node_id)->where('ip', '=', $server->allocation->ip)->whereBetween('port', [self::$minRconPort, self::$maxRconPort])->inRandomOrder()->first();
                if (!$allocation) {
                    throw new DisplayException('Not possible to add new allocation.');
                }

                try {
                    $this->updateAllocations($server, [$allocation->id], []);
                } catch (DisplayException|\Throwable $e) {
                    throw new DisplayException('Failed to assign the new RCON port.');
                }

                $allocation->update(['notes' => 'RCON Port, DO NOT DELETE MANUALLY']);
                $server->update(['rcon_port' => $allocation->port]);
            }

            $this->updateProperties($server, [
                'enable-rcon' => $properties['rcon']['enabled'] ? 'false' : 'true',
                'rcon.port' => $allocation->port ?? '',
                'rcon.password' => $password,
            ]);

            $properties['rcon']['enabled'] = !$properties['rcon']['enabled'];
            $properties['rcon']['port'] = $allocation->port ?? '';
            $properties['rcon']['password'] = $password;
        }

        if ($request->input('type') == 'query') {
            $this->updateProperties($server, [
                'enable-query' => $properties['query']['enabled'] ? 'false' : 'true',
                'query.port' => $server->allocation->port,
            ]);

            $properties['query']['enabled'] = !$properties['query']['enabled'];
            $properties['query']['port'] = $server->allocation->port;
        }

        return $properties;
    }

    /**
     * @param MinecraftRconRequest $request
     * @param Server $server
     * @return array
     * @throws DisplayException
     */
    public function rotatePassword(MinecraftRconRequest $request, Server $server)
    {
        $password = Str::random(10);

        $this->updateProperties($server, [
            'rcon.password' => $password,
        ]);

        return [
            'password' => $password,
        ];
    }

    /**
     * @param $server
     * @return array|array[]
     * @throws DisplayException
     */
    private function loadProperties($server)
    {
        try {
            $properties = $this->daemonFileRepository->setServer($server)->getContent('server.properties');
        } catch (DaemonConnectionException|FileSizeTooLargeException $e) {
            throw new DisplayException('Failed to load the server properties.');
        }

        $response = [
            'rcon' => [
                'enabled' => false,
                'port' => '',
                'password' => '',
            ],
            'query' => [
                'enabled' => false,
                'port' => '',
            ],
        ];

        foreach (explode(PHP_EOL, $properties) as $line) {
            if (empty($line) || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            $exp = explode('=', $line);

            switch ($exp[0]) {
                case 'enable-rcon':
                    $response['rcon']['enabled'] = ($exp[1] ?? '') == 'true';
                    break;
                case 'rcon.port':
                    $response['rcon']['port'] = $exp[1] ?? '';
                    break;
                case 'rcon.password':
                    $response['rcon']['password'] = $exp[1] ?? '';
                    break;
                case 'enable-query':
                    $response['query']['enabled'] = ($exp[1] ?? '') == 'true';
                    break;
                case 'query.port':
                    $response['query']['port'] = $exp[1] ?? '';
                    break;
            }
        }

        return $response;
    }

    /**
     * @param $server
     * @param $add
     * @param $remove
     * @return void
     * @throws DisplayException
     * @throws \Throwable
     */
    private function updateAllocations($server, $add, $remove)
    {
        $this->buildModificationService->handle($server, [
            'database_limit' => $server->database_limit,
            'allocation_limit' => $server->allocation_limit,
            'backup_limit' => $server->backup_limit,
            'add_allocations' => $add,
            'remove_allocations' => $remove,
        ]);
    }

    /**
     * @param Server $server
     * @param $values
     * @return void
     * @throws DisplayException
     */
    private function updateProperties(Server $server, $values)
    {
        try {
            $properties = $this->daemonFileRepository->setServer($server)->getContent('server.properties');
        } catch (DaemonConnectionException|FileSizeTooLargeException $e) {
            throw new DisplayException('Failed to load the server properties.');
        }

        $lines = explode(PHP_EOL, $properties);

        // Update current
        foreach ($lines as $key => $line) {
            if (empty($line) || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            $exp = explode('=', $line);

            foreach ($values as $property => $value) {
                if ($exp[0] == $property) {
                    $lines[$key] = $exp[0] . '=' . $value;
                    unset($values[$property]);
                }
            }
        }

        // Add extra settings if removed
        foreach ($values as $property => $value) {
            $lines[] = $property . '=' . $value;
        }

        try {
            $this->daemonFileRepository->setServer($server)->putContent('server.properties', implode(PHP_EOL, $lines));
        } catch (DaemonConnectionException $e) {
            throw new DisplayException('Failed to save the properties. Please try again...');
        }
    }
}
