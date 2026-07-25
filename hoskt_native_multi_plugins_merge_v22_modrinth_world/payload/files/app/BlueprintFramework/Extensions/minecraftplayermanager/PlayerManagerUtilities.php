<?php

namespace Pterodactyl\BlueprintFramework\Extensions\minecraftplayermanager;

use GuzzleHttp\Pool;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Server;
use Symfony\Component\Yaml\Yaml;
use Illuminate\Support\Facades\Cache;
use GuzzleHttp\Exception\RequestException;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;

class PlayerManagerUtilities
{
    public function __construct(
        private DaemonFileRepository $fileRepository,
    ) {}

    private $configs = [
        'server.properties',
        'bukkit.yml',
        'spigot.yml',
        'paper.yml',
        'config/paper-global.yml',
        'velocity.toml',
        'config.yml',
        'plugins/floodgate/config.yml',
        'ops.json',
        'whitelist.json',
        'banned-players.json',
        'banned-ips.json',
    ];

    public function configs(Server $server): array
    {
        return Cache::remember("minecraftserver:configs:{$server->id}", 10, function () use ($server) {
            $configs = $this->configs;
            $results = [];

            $requests = function () use ($configs, $server) {
                foreach ($configs as $config) {
                    yield new Request(
                        'GET',
                        sprintf('/api/servers/%s/files/contents?file=%s', $server->uuid, urlencode($config))
                    );
                }
            };

            $this->fileRepository->setNode($server->node);

            $pool = new Pool($this->fileRepository->getHttpClient(), $requests(), [
                'concurrency' => count($configs),
                'fulfilled' => function (Response $response, $index) use ($configs, &$results) {
                    $results[$configs[$index]] = $response->getBody()->__toString();
                },
                'rejected' => function (RequestException $reason, $index) use ($configs, &$results) {
                    $results[$configs[$index]] = null;
                },
            ]);

            $pool->promise()->wait();

            return $results;
        });
    }

    public function saveConfig(Server $server, string $file, array|string $contents): void
    {
        $data = is_array($contents) ? json_encode($contents, JSON_PRETTY_PRINT) : $contents;

        $this->fileRepository->setServer($server)->putContent($file, $data);

        $oldCache = Cache::get("minecraftserver:configs:{$server->id}");
        if ($oldCache) {
            $oldCache[$file] = $data;
            Cache::put("minecraftserver:configs:{$server->id}", $oldCache, 10);
        }

        sleep(0.5);
    }

    public function formatUuid(string $uuid): string
    {
        $uuid = str_replace('-', '', $uuid);

        return substr($uuid, 0, 8) . '-' . substr($uuid, 8, 4) . '-' . substr($uuid, 12, 4) . '-' . substr($uuid, 16, 4) . '-' . substr($uuid, 20);
    }

    public function getFloodgatePrefix(Server $server): string|null
    {
        $floodgate = $this->configs($server)['plugins/floodgate/config.yml'];

        if (!$floodgate) {
            return null;
        }

        $parsed = Yaml::parse($floodgate);

        if (isset($parsed['username-prefix'])) {
            return $parsed['username-prefix'];
        }

        return null;
    }

    public function isQueryEnabled(Server $server): bool
    {
        $properties = $this->configs($server)['server.properties'];

        if ($properties) {
            if (str_contains($properties, 'enable-query=true')) {
                return true;
            }
        }

        $velocityToml = $this->configs($server)['velocity.toml'];
        if ($velocityToml) {
            $lines = explode("\n", $velocityToml);

            $lastKey = null;
            foreach ($lines as $line) {
                if (str_starts_with($line, '[') && str_ends_with($line, ']')) {
                    $lastKey = substr($line, 1, -1);
                }

                if ($lastKey === 'query') {
                    if (str_contains($line, 'enabled = true')) {
                        return true;
                    }
                }
            }
        }

        $configYml = $this->configs($server)['config.yml'];
        if ($configYml) {
            if (str_contains($configYml, 'query_enabled: true')) {
                return true;
            }
        }

        return false;
    }

    public function isOfflineMode(Server $server): bool
    {
        if ($this->isProxied($server)) {
            $paperYml = $this->configs($server)['paper.yml'];

            if (!$paperYml) {
                $paperYml = $this->configs($server)['config/paper-global.yml'];
            }

            if (!$paperYml) {
                return false;
            }

            $parsed = Yaml::parse($paperYml);

            if (isset($parsed['proxies'])) {
                if (isset($parsed['proxies']['velocity']) && isset($parsed['proxies']['velocity']['enabled']) && $parsed['proxies']['velocity']['enabled'] === true) {
                    return !$parsed['proxies']['velocity']['online-mode'];
                }

                if (isset($parsed['proxies']['bungee-cord'])) {
                    $spigotYml = $this->configs($server)['spigot.yml'];

                    if ($spigotYml) {
                        if (str_contains($spigotYml, 'bungeecord: true')) {
                            return !$parsed['proxies']['bungee-cord']['online-mode'];
                        }
                    }
                }
            }

            if (isset($parsed['settings'])) {
                if (isset($parsed['settings']['velocity-support']) && $parsed['settings']['velocity-support']['enabled'] === true) {
                    return !$parsed['settings']['velocity-support']['online-mode'];
                }
            }

            return false;
        } else {
            $properties = $this->configs($server)['server.properties'];

            if ($properties) {
                if (str_contains($properties, 'online-mode=false')) {
                    return true;
                }
            }
        }

        $velocityToml = $this->configs($server)['velocity.toml'];
        if ($velocityToml) {
            if (str_contains($velocityToml, 'online-mode = false') || str_contains($velocityToml, 'online-mode=false')) {
                return true;
            }
        }

        $configYml = $this->configs($server)['config.yml'];
        if ($configYml) {
            if (str_contains($configYml, 'online_mode: false')) {
                return true;
            }
        }

        return false;
    }

    public function isProxied(Server $server): bool
    {
        $spigotYml = $this->configs($server)['spigot.yml'];
        if ($spigotYml) {
            if (str_contains($spigotYml, 'bungeecord: true')) {
                return true;
            }
        }

        $paperYml = $this->configs($server)['paper.yml'];
        if (!$paperYml) {
            $paperYml = $this->configs($server)['config/paper-global.yml'];
        }

        if (!$paperYml) {
            return false;
        }

        $parsed = Yaml::parse($paperYml);

        if (isset($parsed['proxies'])) {
            if (isset($parsed['proxies']['velocity']) && $parsed['proxies']['velocity']['enabled'] === true) {
                return true;
            }
        }

        if (isset($parsed['settings'])) {
            if (isset($parsed['settings']['velocity-support']) && $parsed['settings']['velocity-support']['enabled'] === true) {
                return true;
            }
        }

        return false;
    }

    public function isBukkitBased(Server $server): bool
    {
        return $this->configs($server)['bukkit.yml'] !== null;
    }

    public function isProxy(Server $server): bool
    {
        $velocityToml = $this->configs($server)['velocity.toml'];
        if ($velocityToml && strlen($velocityToml) > 100) {
            return true;
        }

        $configYml = $this->configs($server)['config.yml'];
        if ($configYml && strlen($configYml) > 100) {
            return true;
        }

        return false;
    }
}
