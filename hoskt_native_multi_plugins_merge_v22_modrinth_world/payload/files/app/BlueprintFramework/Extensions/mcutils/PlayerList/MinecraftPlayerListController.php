<?php


namespace Pterodactyl\BlueprintFramework\Extensions\mcutils\PlayerList;


use Illuminate\Support\Facades\Http;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Request;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;

class MinecraftPlayerListController extends ClientApiController
{
    public function __construct(
        private DaemonFileRepository $fileRepository,
    ) {
        parent::__construct();
    }

    public function index(Request $request, Server $server): JsonResponse
    {
        $cacheKey = 'minecraft_server_status_' . $server->uuid;
        $cacheTime = 5 * 60; // 5 minutes

        $status = cache()->remember($cacheKey, $cacheTime, function () use ($server) {
            $response = Http::withHeaders([
                'User-Agent' => 'MinecraftServerStatusChecker/1.0'
            ])->get("https://api.mcsrvstat.us/3/{$server->allocation->ip}:{$server->allocation->port}");

            return $response->json();
        });

        return response()->json($status);
    }
}
