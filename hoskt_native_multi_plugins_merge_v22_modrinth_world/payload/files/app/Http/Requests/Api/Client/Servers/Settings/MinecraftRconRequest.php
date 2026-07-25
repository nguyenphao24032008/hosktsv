<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Settings;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class MinecraftRconRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'rcon.manage';
    }
}
