<?php

namespace Pterodactyl\Http\Controllers\Admin\Bagou;

use Illuminate\View\View;
use Pterodactyl\Http\Controllers\Controller;

class BagouMcVersionsController extends Controller
{
    public function index(): View
    {
        return view('admin.bagoucenter.offline');
    }

    public function __call($method, $parameters)
    {
        return view('admin.bagoucenter.offline');
    }
}
