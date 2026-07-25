<?php

namespace Pterodactyl\BlueprintFramework\Extensions\mcutils\ServerIcon;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;


class MinecraftServerIconUpdateRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return 'file.create';
    }

    public function rules(): array
    {
        return [
            'image' => 'required|max:10485760',
        ];
    }
}
