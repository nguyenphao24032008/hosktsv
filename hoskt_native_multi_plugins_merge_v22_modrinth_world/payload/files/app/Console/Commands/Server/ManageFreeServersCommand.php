<?php

namespace Pterodactyl\Console\Commands\Server;

use Carbon\Carbon;
use Pterodactyl\Models\Server;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Services\Servers\SuspensionService;
use Pterodactyl\Services\Servers\ServerDeletionService;
use Pterodactyl\Repositories\Eloquent\SettingsRepository;

class ManageFreeServersCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'p:server:freeservers';

    /**
     * @var string
     */
    protected $description = 'Suspend / delete expired free servers.';

    /**
     * @var SettingsRepository
     */
    protected $settings;

    /**
     * @var ServerDeletionService
     */
    protected $serverDeletionService;

    /**
     * @var SuspensionService
     */
    protected $suspensionService;

    /**
     * ManageFreeServersCommand constructor.
     * @param SettingsRepository $settingsRepository
     * @param ServerDeletionService $serverDeletionService
     * @param SuspensionService $suspensionService
     */
    public function __construct(SettingsRepository $settingsRepository, ServerDeletionService $serverDeletionService, SuspensionService $suspensionService)
    {
        parent::__construct();

        $this->settings = $settingsRepository;
        $this->serverDeletionService = $serverDeletionService;
        $this->suspensionService = $suspensionService;
    }

    /**
     *
     */
    public function handle()
    {
        $freeServers = DB::table('servers')->whereNotNull('free_expire')->where('free_expire', '<=', Carbon::now())->get();
        foreach ($freeServers as $server) {
            if ($server->status == 'suspended') {
                if (Carbon::now() >= Carbon::parse($server->free_expire)->addHours($this->settings->get('settings::freeservers::delete', 24))) {
                    try {
                        $this->serverDeletionService->handle(Server::find($server->id));
                    } catch (DisplayException | \Throwable $e) {
                        $this->error('Failed to delete server: ' . $server->id);
                    }
                }
            } else {
                if ($this->settings->get('settings::freeservers::delete', 24) == 0) {
                    try {
                        $this->serverDeletionService->handle(Server::find($server->id));
                    } catch (DisplayException | \Throwable $e) {
                        $this->error('Failed to delete server: ' . $server->id);
                    }
                } else {
                    try {
                        $this->suspensionService->toggle(Server::find($server->id), SuspensionService::ACTION_SUSPEND);
                    } catch (\Throwable $e) {
                        $this->error('Failed to suspend server: ' . $server->id);
                    }
                }
            }
        }
    }
}
