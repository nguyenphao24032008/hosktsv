<?php

namespace Pterodactyl\Services\Minecraft\Maps;

enum MapProvider: string
{
    case CurseForge = 'curseforge';
    case Modrinth = 'modrinth';
    // case MinecraftMaps = 'minecraftmaps';
    // case MinecraftFrance = 'minecraftfrance';
    // case MinecraftFr = 'minecraftfr';
}
