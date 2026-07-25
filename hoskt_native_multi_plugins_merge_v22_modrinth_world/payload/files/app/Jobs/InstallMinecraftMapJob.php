<?php

namespace Pterodactyl\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Pterodactyl\Models\Server;
use Pterodactyl\Services\Minecraft\Maps\CurseForgeMapService;
use Pterodactyl\Services\Minecraft\Maps\MapProvider;
use Pterodactyl\Services\Minecraft\Maps\ModrinthMapService;
use Throwable;

class InstallMinecraftMapJob implements ShouldQueue
{
    use Queueable;
    use Dispatchable;
    use InteractsWithQueue;
    use SerializesModels;

    public int $tries = 1;
    public int $timeout = 900;

    public function __construct(
        public Server $server,
        public MapProvider $provider,
        public string $mapId,
    ) {
    }

    public function handle(
        CurseForgeMapService $curseForgeMapService,
        ModrinthMapService $modrinthMapService,
    ): void {
        match ($this->provider) {
            MapProvider::CurseForge => $curseForgeMapService->install($this->server, $this->mapId),
            MapProvider::Modrinth => $modrinthMapService->install($this->server, $this->mapId),
        };
    }

    public function failed(Throwable $exception): void
    {
        logger()->error('Queued Minecraft map installation failed.', [
            'server_id' => $this->server->id,
            'provider' => $this->provider->value,
            'map_id' => $this->mapId,
            'exception' => $exception->getMessage(),
        ]);
    }
}
