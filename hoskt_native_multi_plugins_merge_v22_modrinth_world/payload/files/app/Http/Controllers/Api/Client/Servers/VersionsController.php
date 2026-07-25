<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\BagouLicense;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\MinecraftModpacks;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\ServerVariable;
use Pterodactyl\Repositories\Eloquent\ServerRepository;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Services\Minecraft\NativeVersionCatalogService;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class VersionsController extends ClientApiController
{
    private ServerRepository $repository;
    private DaemonFileRepository $fileRepository;

    public function __construct(
        ServerRepository $repository,
        DaemonFileRepository $fileRepository,
        private NativeVersionCatalogService $nativeVersions,
    ) {
        parent::__construct();

        $this->repository = $repository;
        $this->fileRepository = $fileRepository;
    }

    public function listversion(Request $request): array
    {
        $versionsType = strtolower(trim((string) $request->input('versionsType', 'vanilla')));
        $page = max(1, (int) $request->input('page', 1));

        if ($versionsType === 'modpacks' && $request->input('modpacktype') === 'others') {
            return [
                'message' => 'Good',
                'data' => MinecraftModpacks::query()->get()->all(),
                'page' => 1,
            ];
        }

        if ($this->nativeVersions->supports($versionsType)) {
            try {
                return $this->nativeVersions->list($versionsType, $page);
            } catch (\Throwable $exception) {
                logger()->warning('Native Minecraft version provider failed; trying legacy Bagou fallback.', [
                    'type' => $versionsType,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        return $this->legacyBagouList($request, $versionsType, $page);
    }

    public function installversion(Server $server, Request $request): array|int
    {
        $item = $request->input('minecraftVersions', []);
        if (!is_array($item)) {
            throw new BadRequestHttpException('Invalid Minecraft version payload.');
        }

        $type = strtolower(trim((string) $request->input('stype', '')));
        if (($item['source'] ?? null) === NativeVersionCatalogService::SOURCE) {
            return $this->installNativeVersion($server, $type, $item, (string) $request->input('name', ''));
        }

        return $this->installLegacyBagouVersion($server, $request, $item, $type);
    }

    public function getversionsize(Server $server, Request $request): int
    {
        $filename = basename((string) $request->query('filename', ''));
        if ($filename === '') {
            return 0;
        }

        try {
            $contents = $this->fileRepository->setServer($server)->getDirectory($request->query('directory', '/'));
            foreach ($contents as $content) {
                if (($content['name'] ?? null) === $filename) {
                    return max(0, (int) ($content['size'] ?? 0));
                }
            }
        } catch (\Throwable) {
        }

        return 0;
    }

    /** @return array<string,mixed> */
    private function installNativeVersion(Server $server, string $type, array $item, string $activityName): array
    {
        try {
            $download = $this->nativeVersions->resolveDownload($type, $item);
        } catch (\Throwable $exception) {
            throw new BadRequestHttpException($exception->getMessage(), $exception);
        }

        $filename = basename((string) $download['filename']);
        if ($filename === '' || empty($download['url'])) {
            throw new BadRequestHttpException('The selected version did not return a valid download.');
        }

        try {
            $this->fileRepository->setServer($server)->pull(
                (string) $download['url'],
                '/',
                [
                    'filename' => $filename,
                    'foreground' => true,
                ]
            );
        } catch (\Throwable $exception) {
            logger()->error('Native Minecraft version download failed.', [
                'type' => $type,
                'filename' => $filename,
                'message' => $exception->getMessage(),
            ]);
            throw new BadRequestHttpException('The server could not download this version. Check Wings outbound HTTPS/DNS access.', $exception);
        }

        $actualSize = $this->findFileSize($server, $filename);
        $version = (string) ($item['version'] ?? 'latest');
        $installMode = (string) ($download['install_mode'] ?? 'direct');
        $bootstrap = in_array($installMode, ['spigot-buildtools', 'forge-installer'], true);

        if ($installMode === 'spigot-buildtools') {
            $server->forceFill(['startup' => $this->spigotBuildToolsStartup($version)])->save();
        } elseif ($installMode === 'forge-installer') {
            $server->forceFill(['startup' => $this->forgeInstallerStartup()])->save();
        } elseif (in_array($type, ['bungeecord', 'waterfall', 'velocity'], true)) {
            $server->forceFill(['startup' => $this->proxyJarStartup()])->save();
        } else {
            $server->forceFill(['startup' => $this->standardJarStartup()])->save();
        }

        $this->repository->update($server->id, [
            'mcversion' => trim($type . ' ' . $version),
        ]);

        Activity::event('server:versions.install')
            ->property('name', $activityName !== '' ? $activityName : trim($type . ' ' . $version))
            ->property('provider', (string) ($item['provider'] ?? 'native'))
            ->property('install_mode', $installMode)
            ->log();

        $response = [
            'size' => $actualSize > 0 ? $actualSize : (int) ($download['size'] ?? 0),
            'filename' => $filename,
            'archive' => (bool) ($download['archive'] ?? false),
            'completed' => true,
            'bootstrap' => $bootstrap,
            'java' => (int) ($download['java'] ?? $item['java'] ?? 17),
        ];

        if ($installMode === 'spigot-buildtools') {
            $response['note'] = 'BuildTools.jar is ready. Start the server once; the first start compiles Spigot and may take several minutes.';
        } elseif ($installMode === 'forge-installer') {
            $response['note'] = 'Forge installer is ready. Start the server once; the first start installs Forge libraries automatically.';
        }

        return $response;
    }

    private function standardJarStartup(): string
    {
        return 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}} nogui';
    }

    private function proxyJarStartup(): string
    {
        return 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}';
    }

    private function spigotBuildToolsStartup(string $version): string
    {
        $revision = escapeshellarg($version);

        return "if [ ! -f server.jar ]; then "
            . "if ! command -v git >/dev/null 2>&1; then echo '[HOSKT] Spigot BuildTools requires git inside the selected Docker image.'; exit 1; fi; "
            . "echo '[HOSKT] Building Spigot {$version} with official BuildTools...'; "
            . "java -jar BuildTools.jar --rev {$revision}; "
            . "SPIGOT_JAR=\"\$(find . -maxdepth 1 -type f -name 'spigot-*.jar' -print | sort | tail -n 1)\"; "
            . "if [ -z \"\$SPIGOT_JAR\" ]; then echo '[HOSKT] BuildTools did not create a Spigot server JAR. Check the console log and ensure git is available in the Docker image.'; exit 1; fi; "
            . "cp \"\$SPIGOT_JAR\" server.jar; fi; "
            . $this->standardJarStartup();
    }

    private function forgeInstallerStartup(): string
    {
        return "if [ ! -f .hoskt-forge-installed ]; then "
            . "echo '[HOSKT] Installing Forge libraries...'; "
            . "java -jar forge-installer.jar --installServer && touch .hoskt-forge-installed; fi; "
            . "FORGE_ARGS=\"\$(find libraries -type f -path '*/forge/*/unix_args.txt' -print -quit 2>/dev/null)\"; "
            . "if [ -n \"\$FORGE_ARGS\" ]; then "
            . "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true @\"\$FORGE_ARGS\" nogui; "
            . "else FORGE_JAR=\"\$(find . -maxdepth 1 -type f -name 'forge-*.jar' ! -name '*installer*' -print -quit)\"; "
            . "if [ -z \"\$FORGE_JAR\" ]; then echo '[HOSKT] Forge installer completed but no runnable Forge JAR or unix_args.txt was found.'; exit 1; fi; "
            . "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar \"\$FORGE_JAR\" nogui; fi";
    }

    private function installLegacyBagouVersion(Server $server, Request $request, array $item, string $type): int
    {
        $licenseModel = BagouLicense::query()->where('addon', '296')->first();
        if (!$licenseModel) {
            throw new BadRequestHttpException(
                'This provider is not available through the native V20 catalogue. Use the separate Modpacks Manager for modpacks.'
            );
        }

        $license = (string) $licenseModel->license;
        $version = (string) ($item['version'] ?? '');
        if ($version === '') {
            throw new BadRequestHttpException('Version is missing.');
        }

        ini_set('memory_limit', '512M');
        $response = null;

        if ((string) $request->input('type') === '3') {
            $itemUrl = (string) ($item['Url'] ?? '');
            $response = $this->bagouRequest('mcversions/download', [
                'id' => $license,
                'type' => $request->input('type'),
                'version' => $version,
                'stype' => $type,
                'url' => $itemUrl,
                'zip' => 'no',
            ]);
        } elseif (in_array($type, ['fabric', 'forge', 'mohist', 'modpacks'], true)) {
            if (!empty($item['url'])) {
                $response = [
                    'message' => 'Good',
                    'data' => (string) $item['url'],
                    'size' => $this->remoteContentLength((string) $item['url']),
                ];
            } else {
                $response = $this->bagouRequest('mcversions/download', [
                    'id' => $license,
                    'type' => $request->input('type'),
                    'version' => $version,
                    'stype' => $type,
                    'url' => 'a',
                    'zip' => 'yes',
                ]);

                $server->forceFill([
                    'startup' => 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true $( [ ! -f unix_args.txt ] && printf %s "-jar {{SERVER_JARFILE}}" || printf %s "@unix_args.txt" )',
                ])->save();
            }
        } else {
            $response = $this->bagouRequest('mcversions/download', [
                'id' => $license,
                'type' => $request->input('type'),
                'version' => $version,
                'stype' => $type,
                'url' => 'a',
                'zip' => 'no',
            ]);
        }

        if (!is_array($response) || ($response['message'] ?? null) !== 'Good' || empty($response['data'])) {
            throw new BadRequestHttpException('The legacy Bagou download service did not return a usable file.');
        }

        $this->fileRepository->setServer($server)->pull((string) $response['data'], '/');
        $this->repository->update($server->id, ['mcversion' => trim($type . ' ' . $version)]);
        $this->syncLegacyEgg($server, $type);

        Activity::event('server:versions.install')
            ->property('name', (string) $request->input('name', trim($type . ' ' . $version)))
            ->log();

        return max(0, (int) ($response['size'] ?? 0));
    }

    private function legacyBagouList(Request $request, string $versionsType, int $page): array
    {
        try {
            $licenseModel = BagouLicense::query()->where('addon', '296')->first();
            if (!$licenseModel) {
                return [
                    'message' => 'Good',
                    'data' => [],
                    'page' => 1,
                    'offline' => true,
                    'reason' => $this->nativeVersions->supports($versionsType) ? 'native_provider_unavailable' : 'missing_license',
                ];
            }

            $versions = $this->bagouRequest('mcversions', [
                'id' => (string) $licenseModel->license,
                'stype' => $versionsType,
                'url' => (string) ($_SERVER['SERVER_NAME'] ?? config('app.url')),
                'page' => $page,
                'modpacktype' => $request->input('modpacktype'),
            ]);

            if (($versions['message'] ?? null) !== 'Good') {
                return ['message' => 'Good', 'data' => [], 'page' => 1, 'offline' => true, 'reason' => 'bad_response'];
            }

            $versions['data'] = is_array($versions['data'] ?? null) ? $versions['data'] : [];
            $versions['page'] = max(1, (int) ($versions['page'] ?? 1));

            return $versions;
        } catch (\Throwable $exception) {
            logger()->warning('Legacy Bagou version API unavailable.', ['message' => $exception->getMessage()]);
            return ['message' => 'Good', 'data' => [], 'page' => 1, 'offline' => true, 'reason' => 'bagou_api_unavailable'];
        }
    }

    /** @return array<string,mixed> */
    private function bagouRequest(string $path, array $query): array
    {
        $response = Http::acceptJson()
            ->connectTimeout(5)
            ->timeout(20)
            ->get('https://api.bagou450.com/api/client/pterodactyl/' . ltrim($path, '/'), $query);

        return $response->json() ?: [];
    }

    private function findFileSize(Server $server, string $filename): int
    {
        try {
            foreach ($this->fileRepository->setServer($server)->getDirectory('/') as $entry) {
                if (($entry['name'] ?? null) === $filename) {
                    return max(0, (int) ($entry['size'] ?? 0));
                }
            }
        } catch (\Throwable) {
        }

        return 0;
    }

    private function remoteContentLength(string $url): int
    {
        try {
            return max(0, (int) Http::connectTimeout(5)->timeout(15)->head($url)->header('Content-Length', 0));
        } catch (\Throwable) {
            return 0;
        }
    }

    private function syncLegacyEgg(Server $server, string $type): void
    {
        try {
            $eggName = in_array($type, ['bungeecord', 'velocity'], true) ? 'Bungeecord' : 'Paper';
            $egg = Egg::query()->where('name', $eggName)->first();
            if (!$egg) {
                return;
            }

            $server->forceFill(['egg_id' => $egg->id, 'nest_id' => $egg->nest_id])->save();

            if ($eggName === 'Bungeecord') {
                $variable = EggVariable::query()
                    ->where('name', 'Bungeecord Jar File')
                    ->where('egg_id', $egg->id)
                    ->first();
                if ($variable) {
                    ServerVariable::query()->updateOrCreate(
                        ['server_id' => $server->id, 'variable_id' => $variable->id],
                        ['variable_value' => 'server.jar']
                    );
                }
            }
        } catch (\Throwable $exception) {
            logger()->warning('Unable to synchronize legacy version-manager egg.', ['message' => $exception->getMessage()]);
        }
    }
}
