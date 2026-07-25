<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Pterodactyl\Models\Filters\MultiFieldServerFilter;
use Pterodactyl\Repositories\Eloquent\ServerRepository;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Transformers\Api\Client\ServerTransformer;
use Pterodactyl\Http\Requests\Api\Client\GetServersRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Exceptions\DisplayException;

class VersionsPeController extends ClientApiController
{
    /**
     * @var \Pterodactyl\Repositories\Eloquent\ServerRepository
     */
    private $repository;

    /**
     * ClientController constructor.
     */
    public function __construct(ServerRepository $repository)
    {
        parent::__construct();

        $this->repository = $repository;
    }

    public function pocketmine(Request $request)
    {          
        $versions = Http::accept('application/json')->get('https://api.github.com/repos/pmmp/PocketMine-MP/releases?per_page=50000')->object();
        return json_encode($versions);
    }
}
