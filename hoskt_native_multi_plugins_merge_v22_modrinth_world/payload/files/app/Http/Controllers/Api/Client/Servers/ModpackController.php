<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Jobs\Server\InstallModpackJob;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\Server;
use Pterodactyl\Services\Minecraft\Modpacks\AbstractModpackService;
use Pterodactyl\Services\Minecraft\Modpacks\ATLauncherModpackService;
use Pterodactyl\Services\Minecraft\Modpacks\CurseForgeModpackService;
use Pterodactyl\Services\Minecraft\Modpacks\FeedTheBeastModpackService;
use Pterodactyl\Services\Minecraft\Modpacks\ModrinthModpackService;
use Pterodactyl\Services\Minecraft\Modpacks\TechnicModpackService;
use Pterodactyl\Services\Minecraft\Modpacks\VoidsWrathModpackService;

enum ModpackProvider: string
{
    case ATLauncher = 'atlauncher';
    case CurseForge = 'curseforge';
    case FeedTheBeast = 'feedthebeast';
    case Modrinth = 'modrinth';
    case Technic = 'technic';
    case VoidsWrath = 'voidswrath';
}

class ModpackController extends ClientApiController
{
    /**
     * ModpackController constructor.
     */
    public function __construct(
        protected ATLauncherModpackService $atLauncherModpackService,
        protected CurseForgeModpackService $curseForgeModpackService,
        protected FeedTheBeastModpackService $feedTheBeastModpackService,
        protected ModrinthModpackService $modrinthModpackService,
        protected TechnicModpackService $technicModpackService,
        protected VoidsWrathModpackService $voidsWrathModpackService
    ) {
        parent::__construct();
    }

    protected function providerToService(ModpackProvider $provider): AbstractModpackService {
        return match ($provider) {
            ModpackProvider::ATLauncher => $this->atLauncherModpackService,
            ModpackProvider::CurseForge => $this->curseForgeModpackService,
            ModpackProvider::FeedTheBeast => $this->feedTheBeastModpackService,
            ModpackProvider::Modrinth => $this->modrinthModpackService,
            ModpackProvider::Technic => $this->technicModpackService,
            ModpackProvider::VoidsWrath => $this->voidsWrathModpackService,
        };
    }

    /**
     * List modpacks for a specific provider.
     */
    public function index(Request $request, Server $server)
    {
        $validated = $request->validate([
            'provider' => ['required', Rule::enum(ModpackProvider::class)],
            'page' => 'required|numeric|integer|min:1',
            'page_size' => 'required|numeric|integer|max:50', // CurseForge page size max is 50
            'search_query' => 'nullable|string',
        ]);

        $provider = ModpackProvider::from($validated['provider']);
        $page = (int) $validated['page'];
        $pageSize = (int) $validated['page_size'];
        $searchQuery = $validated['search_query'] ?? '';

        try {
            $data = $this->providerToService($provider)->search($searchQuery, $pageSize, $page);
        } catch (\Throwable $exception) {
            logger()->warning('Modpack provider search failed.', [
                'provider' => $provider->value,
                'message' => $exception->getMessage(),
            ]);
            $data = ['data' => [], 'total' => 0];
        }

        $modpacks = is_array($data['data'] ?? null) ? $data['data'] : [];

        $installedModpack = DB::table('modpack_installations')
            ->select('modpack_id', 'provider')
            ->where('server_id', $server->id)
            ->first();

        $details = null;
        if ($installedModpack) {
            // Never make the provider selector wait on a second external API request.
            // Details already cached by a previous successful request are still displayed.
            $cacheKey = "modpack-details-$installedModpack->provider-$installedModpack->modpack_id";
            $details = Cache::get($cacheKey);
            if (is_array($details)) {
                $details['id'] = $installedModpack->modpack_id;
                $details['provider'] = $installedModpack->provider;
            } else {
                $details = null;
            }
        }

        return [
            'object' => 'list',
            'data' => $modpacks,
            'meta' => [
                'installed_modpack' => $details,
                'pagination' => [
                    'total' => (int) ($data['total'] ?? count($modpacks)),
                    'count' => count($modpacks),
                    'per_page' => $pageSize,
                    'current_page' => $page,
                    'total_pages' => max(1, (int) ceil(((int) ($data['total'] ?? count($modpacks))) / max(1, $pageSize))),
                    'links' => [],
                ],
            ],
        ];
    }

    /**
     * List modpack versions of a specific modpack.
     */
    public function versions(Request $request)
    {
        $validated = $request->validate([
            'provider' => ['required', Rule::enum(ModpackProvider::class)],
            'modpack_id' => 'required|string|min:1',
        ]);

        $provider = ModpackProvider::from($validated['provider']);
        $modpackId = $validated['modpack_id'];

        $versions = $this->providerToService($provider)->versions($modpackId);

        return $versions;
    }

    /**
     * Start modpack installation procedure.
     */
    public function install(
        Request $request,
        Server $server
    ) {
        if (! $request->user()->can(Permission::ACTION_FILE_CREATE, $server)) {
            throw new AuthorizationException;
        }

        $installerEgg = Egg::where('author', 'modpack-installer@ric-rac.org')->first();
        if (! $installerEgg) {
            throw new DisplayException('Please inform your system administrators that the modpack installation service (egg) is missing.');
        }

        $validated = $request->validate([
            'provider' => ['required', Rule::enum(ModpackProvider::class)],
            'modpack_id' => 'required|string',
            'modpack_version_id' => 'required|string',
            'delete_server_files' => 'required|boolean',
        ]);

        $provider = ModpackProvider::from($validated['provider']);
        $modpackId = $validated['modpack_id'];
        $modpackVersionId = $validated['modpack_version_id'];
        $deleteServerFiles = (bool) $validated['delete_server_files'];

        InstallModpackJob::dispatch($server, $provider->value, $modpackId, $modpackVersionId, $deleteServerFiles);

        DB::table('modpack_installations')->upsert(
            [
                ['provider' => $provider->value, 'modpack_id' => $modpackId, 'server_id' => $server->id, 'finalized' => false],
            ],
            ['server_id'],
            ['provider', 'modpack_id', 'finalized']
        );

        $activity = Activity::event('server:modpack.install')
            ->property('provider', $provider->value)
            ->property('modpack_id', $modpackId)
            ->property('modpack_version_id', $modpackVersionId);
        $service = $this->providerToService($provider);
        if (!empty($details = $service->details($modpackId))) {
            $activity->property('modpack_name', $details['name']);
        }
        $activity->log();

        return response()->noContent();
    }
}
