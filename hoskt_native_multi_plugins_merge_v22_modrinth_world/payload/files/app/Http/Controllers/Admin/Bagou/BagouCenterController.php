<?php

namespace Pterodactyl\Http\Controllers\Admin\Bagou;

use Illuminate\View\View;
use Pterodactyl\Http\Controllers\Controller;

class BagouCenterController extends Controller
{
    public function index(): View
    {
        return view('admin.bagoucenter.index', ['apistatus' => 0, 'cdnstatus' => 0]);
    }

    public function settings(): View
    {
        return view('admin.bagoucenter.offline');
    }
}
