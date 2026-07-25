<?php
/**
 * HOSKT Native Multi Plugins routes v15.
 * Required from routes/api-client.php by install.sh.
 */

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Middleware\Activity\ServerSubject;
use Pterodactyl\Http\Middleware\Api\Client\Server\AuthenticateServerAccess;
use Pterodactyl\Http\Middleware\Api\Client\Server\ResourceBelongsToServer;
use Pterodactyl\Http\Middleware\Api\Client\Server\IsMinecraft;
use Pterodactyl\Http\Controllers\Api\Client;
use Pterodactyl\BlueprintFramework\Extensions\blueserverproperties as BlueServerProperties;
use Pterodactyl\BlueprintFramework\Extensions\minecraftplayermanager as PlayerManager;
use Pterodactyl\BlueprintFramework\Extensions\mcutils as McUtils;

spl_autoload_register(function ($class) {
    $prefix = 'Cloudflare\\API\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) return;
    $relative = substr($class, strlen($prefix));
    $file = base_path('vendor/cloudflare/sdk/src/' . str_replace('\\', '/', $relative) . '.php');
    if (is_file($file)) require_once $file;
});

Route::get('/extensions/blueserverproperties/settings/nav-text', [BlueServerProperties\SettingsController::class, 'getNavButtonText']);
Route::group(['prefix' => '/extensions/blueserverproperties/{server}', 'middleware' => [ServerSubject::class, AuthenticateServerAccess::class, ResourceBelongsToServer::class]], function () {
    Route::get('/', [BlueServerProperties\ServerConfigEditorController::class, 'fetch']);
    Route::post('/update', [BlueServerProperties\ServerConfigEditorController::class, 'update']);
});

Route::group(['prefix' => '/extensions/minecraftplayermanager/servers/{server}', 'middleware' => [ServerSubject::class, AuthenticateServerAccess::class, ResourceBelongsToServer::class]], function () {
    Route::get('/', [PlayerManager\PlayerManagerController::class, 'index']);
    Route::get('/skin', [PlayerManager\PlayerManagerController::class, 'skin']);
    Route::get('/offline', [PlayerManager\PlayerManagerController::class, 'offline']);
    Route::get('/stats/{uuid}', [PlayerManager\PlayerManagerController::class, 'stats']);
    Route::post('/whitelist/status', [PlayerManager\PlayerManagerController::class, 'setwhitelist']);
    Route::put('/whitelist', [PlayerManager\PlayerManagerController::class, 'addwhitelist']);
    Route::delete('/whitelist', [PlayerManager\PlayerManagerController::class, 'removewhitelist']);
    Route::put('/op', [PlayerManager\PlayerManagerController::class, 'op']);
    Route::delete('/op', [PlayerManager\PlayerManagerController::class, 'deop']);
    Route::put('/ban', [PlayerManager\PlayerManagerController::class, 'ban']);
    Route::delete('/ban', [PlayerManager\PlayerManagerController::class, 'unban']);
    Route::put('/ban-ip', [PlayerManager\PlayerManagerController::class, 'banIp']);
    Route::put('/ban-ip-player', [PlayerManager\PlayerManagerController::class, 'banIpPlayer']);
    Route::delete('/ban-ip', [PlayerManager\PlayerManagerController::class, 'unbanIp']);
    Route::post('/kick', [PlayerManager\PlayerManagerController::class, 'kick']);
    Route::post('/clear', [PlayerManager\PlayerManagerController::class, 'clear']);
    Route::post('/wipe', [PlayerManager\PlayerManagerController::class, 'wipe']);
    Route::post('/kill', [PlayerManager\PlayerManagerController::class, 'kill']);
});

Route::group(['prefix' => '/extensions/mcutils/servers/{server}', 'middleware' => [ServerSubject::class, AuthenticateServerAccess::class, ResourceBelongsToServer::class]], function () {
    Route::get('/', [McUtils\ServerIcon\MinecraftServerIconController::class, 'index']);
    Route::patch('/', [McUtils\ServerIcon\MinecraftServerIconController::class, 'update']);
    Route::get('/playerlist', [McUtils\PlayerList\MinecraftPlayerListController::class, 'index']);
});

Route::group(['prefix' => '/freeservers'], function () {
    Route::get('/', [Client\FreeServersController::class, 'index']);
    Route::get('/{uuid}/info', [Client\FreeServersController::class, 'info']);
    Route::post('/create', [Client\FreeServersController::class, 'create']);
    Route::post('/{uuid}/renew', [Client\FreeServersController::class, 'renew']);
    Route::post('/{uuid}/delete', [Client\FreeServersController::class, 'delete']);
});

Route::group(['prefix' => '/servers/{server}', 'middleware' => [ServerSubject::class, AuthenticateServerAccess::class, ResourceBelongsToServer::class]], function () {
    Route::group(['prefix' => '/subdomain'], function () {
        Route::get('/', [Client\Servers\SubdomainController::class, 'index']);
        Route::post('/create', [Client\Servers\SubdomainController::class, 'create']);
        Route::delete('/delete/{id}', [Client\Servers\SubdomainController::class, 'delete']);
    });
    Route::group(['prefix' => '/settings/rcon', 'middleware' => [IsMinecraft::class]], function () {
        Route::get('/', [Client\Servers\MinecraftRconController::class, 'load']);
        Route::post('/toggle', [Client\Servers\MinecraftRconController::class, 'toggle']);
        Route::post('/password', [Client\Servers\MinecraftRconController::class, 'rotatePassword']);
    });
    Route::group(['prefix' => '/minecraft-modpacks'], function () {
        Route::get('/', [Client\Servers\ModpackController::class, 'index']);
        Route::get('/versions', [Client\Servers\ModpackController::class, 'versions']);
        Route::post('/install', [Client\Servers\ModpackController::class, 'install']);
    });
    Route::group(['prefix' => '/minecraft-worlds'], function () {
        Route::get('/', [Client\Servers\MinecraftWorldController::class, 'index']);
        Route::post('/make-default', [Client\Servers\MinecraftWorldController::class, 'makeDefault']);
        Route::get('/maps', [Client\Servers\MinecraftWorldController::class, 'maps']);
        Route::post('/maps/install', [Client\Servers\MinecraftWorldController::class, 'installMap']);
    });
    Route::group(['prefix' => '/versions'], function () {
        Route::get('/listversion', [Client\Servers\VersionsController::class, 'listversion']);
        Route::get('/getversionsize', [Client\Servers\VersionsController::class, 'getversionsize']);
        Route::post('/installversion', [Client\Servers\VersionsController::class, 'installversion']);
        Route::get('/listpocketmine', [Client\Servers\VersionsPeController::class, 'pocketmine']);
    });
});
