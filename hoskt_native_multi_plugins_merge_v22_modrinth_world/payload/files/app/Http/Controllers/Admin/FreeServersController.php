<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Repositories\Eloquent\SettingsRepository;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class FreeServersController extends Controller
{
    /**
     * @var \Prologue\Alerts\AlertsMessageBag
     */
    protected $alert;

    /**
     * @var SettingsRepository
     */
    protected $settingsRepository;

    /**
     * FreeServersController constructor.
     * @param AlertsMessageBag $alert
     * @param SettingsRepository $settingsRepository
     */
    public function __construct(AlertsMessageBag $alert, SettingsRepository $settingsRepository)
    {
        $this->alert = $alert;
        $this->settingsRepository = $settingsRepository;
    }

    /**
     * @return \Illuminate\Contracts\Foundation\Application|\Illuminate\Contracts\View\Factory|\Illuminate\Contracts\View\View
     */
    public function index()
    {
        $packages = DB::table('free_packages')->get();

        foreach ($packages as $key => $package) {
            $eggs = '';
            $nodes = '';

            foreach (explode(',', $package->egg_ids) as $eggId) {
                $egg = DB::table('eggs')->where('id', '=', $eggId)->get();
                if (count($egg) > 0) {
                    $eggs .= $egg[0]->name . ', ';
                }
            }

            foreach (explode(',', $package->node_ids) as $nodeId) {
                $node = DB::table('nodes')->where('id', '=', $nodeId)->get();
                if (count($node) > 0) {
                    $nodes .= $node[0]->name . ', ';
                }
            }

            $packages[$key]->egg_names = rtrim(trim($eggs), ',');
            $packages[$key]->node_names = rtrim(trim($nodes), ',');
        }

        return view('admin.freeservers.list', [
            'packages' => $packages,
            'limit' => $this->settingsRepository->get('settings::freeservers::limit', 1),
            'time' => $this->settingsRepository->get('settings::freeservers::time', 24),
            'delete' => $this->settingsRepository->get('settings::freeservers::delete', 24),
        ]);
    }

    /**
     * @return \Illuminate\Contracts\Foundation\Application|\Illuminate\Contracts\View\Factory|\Illuminate\Contracts\View\View
     */
    public function new()
    {
        return view('admin.freeservers.new', [
            'nodes' => DB::table('nodes')->get(),
            'eggs' => DB::table('eggs')->get(),
        ]);
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     * @throws \Illuminate\Validation\ValidationException
     */
    public function create(Request $request)
    {
        $this->validateRequest($request);

        $package = DB::table('free_packages')->insert([
            'name' => trim(strip_tags($request->input('name', 'Default Package Name'))),
            'image' => trim(strip_tags($request->input('image', ''))),
            'memory' => (int) $request->input('memory', 0),
            'disk' => (int) $request->input('disk', 0),
            'cpu' => (int) $request->input('cpu', 0),
            'swap' => (int) $request->input('swap', 0),
            'database_limit' => (int) $request->input('database_limit', 0),
            'allocation_limit' => (int) $request->input('allocation_limit', 0),
            'backup_limit' => (int) $request->input('backup_limit', 0),
            'node_ids' => implode(',', $request->input('node_ids', [])),
            'egg_ids' => implode(',', $request->input('egg_ids', [])),
        ]);

        $this->alert->success('You\'ve successfully created the new free server package.')->flash();

        return redirect()->route('admin.freeservers');
    }

    /**
     * @param Request $request
     * @param $id
     * @return \Illuminate\Contracts\Foundation\Application|\Illuminate\Contracts\View\Factory|\Illuminate\Contracts\View\View
     */
    public function view(Request $request, $id)
    {
        $package = DB::table('free_packages')->where('id', '=', (int) $id)->get();
        if (count($package) < 1) {
            throw new NotFoundHttpException('Package not found.');
        }

        return view('admin.freeservers.view', [
            'package' => $package[0],
            'nodes' => DB::table('nodes')->get(),
            'eggs' => DB::table('eggs')->get(),
        ]);
    }

    /**
     * @param Request $request
     * @param $id
     * @return \Illuminate\Http\RedirectResponse
     * @throws DisplayException
     * @throws \Illuminate\Validation\ValidationException
     */
    public function edit(Request $request, $id)
    {
        $package = DB::table('free_packages')->where('id', '=', (int) $id)->get();
        if (count($package) < 1) {
            throw new DisplayException('Free package not found.');
        }

        $this->validateRequest($request);

        DB::table('free_packages')->where('id', '=', $package[0]->id)->update([
            'name' => trim(strip_tags($request->input('name', 'Default Package Name'))),
            'image' => trim(strip_tags($request->input('image', ''))),
            'memory' => (int) $request->input('memory', 0),
            'disk' => (int) $request->input('disk', 0),
            'cpu' => (int) $request->input('cpu', 0),
            'swap' => (int) $request->input('swap', 0),
            'database_limit' => (int) $request->input('database_limit', 0),
            'allocation_limit' => (int) $request->input('allocation_limit', 0),
            'backup_limit' => (int) $request->input('backup_limit', 0),
            'node_ids' => implode(',', $request->input('node_ids', [])),
            'egg_ids' => implode(',', $request->input('egg_ids', [])),
        ]);

        $this->alert->success('You\'ve successfully edited this free server package.')->flash();

        return back();
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     * @throws \Illuminate\Validation\ValidationException
     */
    public function delete(Request $request)
    {
        $this->validate($request, [
            'id' => 'required|int|exists:free_packages',
        ]);

        DB::table('free_packages')->where('id', '=', $request->input('id'))->delete();

        return response()->json(['success' => true]);
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     * @throws \Illuminate\Validation\ValidationException
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function settings(Request $request)
    {
        $this->validate($request, [
            'limit' => 'required|int',
            'time' => 'required|int|min:1',
            'delete' => 'required|int',
        ]);

        $this->settingsRepository->set('settings::freeservers::limit', $request->input('limit', 1));
        $this->settingsRepository->set('settings::freeservers::time', $request->input('time', 24));
        $this->settingsRepository->set('settings::freeservers::delete', $request->input('delete', 24));

        $this->alert->success('You\'ve successfully saved free servers settings.')->flash();

        return back();
    }

    /**
     * @param Request $request
     * @throws \Illuminate\Validation\ValidationException
     */
    private function validateRequest(Request $request)
    {
        $this->validate($request, [
            'name' => 'required|max:60',
            'image' => 'required',
            'memory' => 'required|int',
            'disk' => 'required|int',
            'cpu' => 'required|int',
            'swap' => 'required|int',
            'database_limit' => 'required|int',
            'allocation_limit' => 'required|int',
            'backup_limit' => 'required|int',
            'node_ids' => 'required|array',
            'node_ids.*' => 'required|int|exists:nodes,id',
            'egg_ids' => 'required|array',
            'egg_ids.*' => 'required|int|exists:eggs,id',
        ]);
    }
}
