<?php

namespace Pterodactyl\Services\Minecraft\Maps;

use Pterodactyl\Models\Server;

abstract class AbstractMapService
{
    protected string $userAgent;

    public function __construct()
    {
        $this->userAgent = config('app.name') . '/' . config('app.version') . ' (' . url('/') . ')';
    }

    abstract public function search(string $query, int $pageSize, int $page): array;

    abstract public function install(Server $server, string $mapId): void;
}
