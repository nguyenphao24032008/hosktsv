<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Carbon\Carbon;
use Illuminate\Support\Arr;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Servers\SuspensionService;
use Pterodactyl\Services\Servers\ServerDeletionService;
use Pterodactyl\Services\Servers\ServerCreationService;
use Pterodactyl\Repositories\Eloquent\SettingsRepository;
use Pterodactyl\Http\Requests\Api\Client\FreeServersRequest;
use Pterodactyl\Exceptions\Repository\RecordNotFoundException;
use Pterodactyl\Exceptions\Service\Deployment\NoViableNodeException;
use Pterodactyl\Exceptions\Service\Deployment\NoViableAllocationException;

class FreeServersController extends ClientApiController
{
    /**
     * @var ServerCreationService
     */
    protected $serverCreationService;

    /**
     * @var SettingsRepository
     */
    protected $settingsRepository;

    /**
     * @var SuspensionService
     */
    protected $suspensionService;

    /**
     * @var ServerDeletionService
     */
    protected $serverDeletionService;

    /**
     * FreeServersController constructor.
     * @param ServerCreationService $serverCreationService
     * @param SettingsRepository $settingsRepository
     * @param SuspensionService $suspensionService
     */
    public function __construct(ServerCreationService $serverCreationService, SettingsRepository $settingsRepository, SuspensionService $suspensionService, ServerDeletionService $serverDeletionService)
    {
        parent::__construct();

        $this->serverCreationService = $serverCreationService;
        $this->settingsRepository = $settingsRepository;
        $this->suspensionService = $suspensionService;
        $this->serverDeletionService = $serverDeletionService;
    }

    /**
     * @param FreeServersRequest $request
     * @return array
     */
    public function index(FreeServersRequest $request)
    {
        $packages = DB::table('free_packages')->get();

        foreach ($packages as $key => $package) {
            $eggs = [];

            foreach (explode(',', $package->egg_ids) as $eggId) {
                $egg = DB::table('eggs')->where('id', '=', $eggId)->get();
                if (count($egg) > 0) {
                    array_push($eggs, [
                        'id' => $egg[0]->id,
                        'name' => $egg[0]->name,
                    ]);
                }
            }

            $package->eggs = $eggs;

            $packages[$key] = Arr::only(json_decode(json_encode($package), true), ['id', 'name', 'image', 'eggs']);
        }

        return [
            'success' => true,
            'data' => [
                'packages' => $packages,
            ],
        ];
    }

    /**
     * @param FreeServersRequest $request
     * @return array
     * @throws DisplayException
     * @throws ValidationException
     */
    public function create(FreeServersRequest $request)
    {
        $this->validate($request, [
            'packageId' => 'required|int|exists:free_packages,id',
            'eggId' => 'required|int|exists:eggs,id',
        ]);

        $userFreeServers = DB::table('servers')->where('owner_id', '=', Auth::user()->id)->where('free_package_id', '!=', 0)->get();
        if (count($userFreeServers) >= $this->settingsRepository->get('settings::freeservers::limit')) {
            throw new DisplayException("You can't create more free servers. Maximum is {$this->settingsRepository->get('settings::freeservers::limit', 1)} pc.");
        }

        $egg = DB::table('eggs')->where('id', '=', (int) $request->input('eggId'))->first();
        $package = DB::table('free_packages')->where('id', '=', (int) $request->input('packageId'))->first();

        if (!in_array((int) $request->input('eggId'), explode(',', $package->egg_ids))) {
            throw new DisplayException('Invalid game type.');
        }

        $node = DB::table('nodes')->where('id', '=', explode(',', $package->node_ids)[array_rand(explode(',', $package->node_ids))])->get();
        if (count($node) < 1) {
            throw new DisplayException('Node not found.');
        }

        $allocationId = DB::table('allocations')->where('node_id', '=', $node[0]->id)->whereNull('server_id')->inRandomOrder()->first()->id;

        $env = DB::table('egg_variables')->where('egg_id', '=', (int) $request->input('eggId'))->get();
        $environment = [];

        foreach ($env as $item) {
            $environment[$item->env_variable] = $item->default_value;
        }

        try {
            $server = $this->serverCreationService->handle([
                'name' => Auth::user()->name_first . '\'s Test Server',
                'description' => '',
                'owner_id' => Auth::user()->id,
                'node_id' => $node[0]->id,
                'allocation_id' => $allocationId,
                'allocation_additional' => [],
                'database_limit' => $package->database_limit,
                'allocation_limit' => $package->allocation_limit,
                'backup_limit' => $package->backup_limit,
                'memory' => (int) $package->memory,
                'disk' => (int) $package->disk,
                'swap' => (int) $package->swap,
                'io' => 500,
                'cpu' => (int) $package->cpu,
                'threads' => '',
                'nest_id' => $egg->nest_id,
                'egg_id' => $egg->id,
                'pack_id' => 0,
                'startup' => $egg->startup,
                'image' => json_decode($egg->docker_images, true)[array_keys(json_decode($egg->docker_images, true))[0]],
                'environment' => $environment,
                'start_on_completion' => true,
            ]);
        } catch (ValidationException | NoViableAllocationException | NoViableNodeException | DisplayException | RecordNotFoundException | \Throwable $e) {
            throw new DisplayException('Failed to create the new server. Please try again later...');
        }

        DB::table('servers')->where('id', '=', $server->id)->update([
            'free_package_id' => $package->id,
            'free_expire' => Carbon::now()->addHours($this->settingsRepository->get('settings::freeservers::time', 24)),
        ]);

        return [
            'success' => true,
            'data' => [
                'uuid' => $server->uuidShort,
            ],
        ];
    }

    /**
     * @param FreeServersRequest $request
     * @param $uuid
     * @return array
     * @throws DisplayException
     */
    public function info(FreeServersRequest $request, $uuid)
    {
        $server = DB::table('servers')->where('uuid', '=', trim(strip_tags($uuid)))->get();
        if (count($server) < 1) {
            throw new DisplayException('Server not found.');
        }

        if (Auth::user()->id !== $server[0]->owner_id && !Auth::user()->root_admin) {
            if (!Server::find($server[0]->id)->subusers->contains('user_id', Auth::user()->id)) {
                throw new DisplayException('You don\'t have an access to this action.');
            }
        }

        return [
            'success' => true,
            'data' => [
                'isFreeServer' => $server[0]->free_package_id != 0,
                'expire' => $server[0]->free_expire,
                'addHours' => $this->settingsRepository->get('settings::freeservers::time', 24),
            ],
        ];
    }

    /**
     * @param FreeServersRequest $request
     * @param $uuid
     * @return array
     * @throws DisplayException
     */
    public function renew(FreeServersRequest $request, $uuid)
    {
        $server = DB::table('servers')->where('uuid', '=', trim(strip_tags($uuid)))->get();
        if (count($server) < 1) {
            throw new DisplayException('Server not found.');
        }

        if (Auth::user()->id !== $server[0]->owner_id && !Auth::user()->root_admin) {
            if (!Server::find($server[0]->id)->subusers->contains('user_id', Auth::user()->id)) {
                throw new DisplayException('You don\'t have an access to this action.');
            }
        }

        if ($server[0]->status == 'suspended') {
            try {
                $this->suspensionService->toggle(Server::find($server[0]->id), SuspensionService::ACTION_UNSUSPEND);
            } catch (\Throwable $e) {
                throw new DisplayException('Failed to unsuspend the server.');
            }

            $expire = Carbon::now()->addHours($this->settingsRepository->get('settings::freeservers::time', 24));
        } else {
            $expire = Carbon::parse($server[0]->free_expire)->addHours($this->settingsRepository->get('settings::freeservers::time', 24));

            if (Carbon::now()->addHours($this->settingsRepository->get('settings::freeservers::time', 24) * 2) < $expire) {
                throw new DisplayException('You can\'t renew your server currently, because you can only once at one time period.');
            }
        }

        DB::table('servers')->where('id', '=', $server[0]->id)->update([
            'free_expire' => $expire,
        ]);

        return [
            'success' => true,
            'data' => [],
        ];
    }

    /**
     * @param FreeServersRequest $request
     * @param $uuid
     * @return array
     * @throws DisplayException
     */
    public function delete(FreeServersRequest $request, $uuid)
    {
        $server = DB::table('servers')->where('uuid', '=', trim(strip_tags($uuid)))->get();
        if (count($server) < 1) {
            throw new DisplayException('Server not found.');
        }

        if (Auth::user()->id !== $server[0]->owner_id && !Auth::user()->root_admin) {
            if (!Server::find($server[0]->id)->subusers->contains('user_id', Auth::user()->id)) {
                throw new DisplayException('You don\'t have an access to this action.');
            }
        }

        try {
            $this->serverDeletionService->handle(Server::find($server[0]->id));
        } catch (DisplayException | \Throwable $e) {
            throw new DisplayException('Failed to delete the server. Please try again...');
        }

        return [
            'success' => true,
            'data' => [],
        ];
    }
}