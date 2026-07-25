<?php
/** HOSKT Native Multi Plugins admin routes v15. */

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Controllers\Admin;

Route::group(['prefix' => 'subdomain'], function () {
    Route::get('/', [Admin\SubDomainController::class, 'index'])->name('admin.subdomain');
    Route::get('/new', [Admin\SubDomainController::class, 'new'])->name('admin.subdomain.new');
    Route::get('/edit/{id}', [Admin\SubDomainController::class, 'edit'])->name('admin.subdomain.edit');
    Route::post('/settings', [Admin\SubDomainController::class, 'settings'])->name('admin.subdomain.settings');
    Route::post('/create', [Admin\SubDomainController::class, 'create'])->name('admin.subdomain.create');
    Route::post('/update/{id}', [Admin\SubDomainController::class, 'update'])->name('admin.subdomain.update');
    Route::delete('/delete', [Admin\SubDomainController::class, 'delete'])->name('admin.subdomain.delete');
});

Route::group(['prefix' => '/freeservers'], function () {
    Route::get('/', [Admin\FreeServersController::class, 'index'])->name('admin.freeservers');
    Route::get('/create', [Admin\FreeServersController::class, 'new'])->name('admin.freeservers.create');
    Route::post('/create', [Admin\FreeServersController::class, 'create']);
    Route::post('/settings', [Admin\FreeServersController::class, 'settings'])->name('admin.freeservers.settings');
    Route::delete('/delete', [Admin\FreeServersController::class, 'delete'])->name('admin.freeservers.delete');
    Route::group(['prefix' => '/{id}'], function() {
        Route::get('/', [Admin\FreeServersController::class, 'view'])->name('admin.freeservers.view');
        Route::post('/', [Admin\FreeServersController::class, 'edit']);
    });
});

Route::group(['prefix' => 'bagoucenter'], function () {
    Route::get('/', [Admin\Bagou\BagouCenterController::class, 'index'])->name('admin.bagoucenter');
    Route::get('/license/', [Admin\Bagou\BagouLicenseController::class, 'index'])->name('admin.bagoucenter.license');
    Route::get('/license/{addon}', [Admin\Bagou\BagouLicenseController::class, 'license'])->name('admin.bagoucenter.license.addon');
    Route::get('/versions/', [Admin\Bagou\BagouVersionsController::class, 'index'])->name('admin.bagoucenter.versions');
    Route::get('/settings', [Admin\Bagou\BagouSettingsController::class, 'index'])->name('admin.bagoucenter.settings');
    Route::get('/settings/{addon}', [Admin\Bagou\BagouSettingsController::class, 'settings'])->name('admin.bagoucenter.settings.addon');
    Route::get('/support/', [Admin\Bagou\BagouCenterController::class, 'settings'])->name('admin.bagoucenter.support');
    Route::post('/license/{addon}', [Admin\Bagou\BagouLicenseController::class, 'setlicense']);
    Route::post('/versions', [Admin\Bagou\BagouVersionsController::class, 'refresh']);
    Route::delete('/license/{addon}', [Admin\Bagou\BagouLicenseController::class, 'removelicense']);
    Route::group(['prefix' => 'settings/addon/mcversion'], function () {
        Route::get('/', [Admin\Bagou\BagouMcVersionsController::class, 'index'])->name('admin.bagoucenter.settings.addon.mcversions');
        Route::post('/', [Admin\Bagou\BagouMcVersionsController::class, 'add']);
        Route::delete('/{name}', [Admin\Bagou\BagouMcVersionsController::class, 'delete']);
    });
});
