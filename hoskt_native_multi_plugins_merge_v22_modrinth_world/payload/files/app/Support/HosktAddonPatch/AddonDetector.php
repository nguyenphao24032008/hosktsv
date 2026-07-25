<?php

namespace Pterodactyl\Support\HosktAddonPatch;

use Illuminate\Support\Facades\View;
use Illuminate\View\View as LaravelView;

final class AddonDetector
{
    public const VERSION = 'v21';

    /**
     * Addons supported by this HOSKT addon-tab patch.
     *
     * This patch does not install or redistribute addons. It only detects addons that are
     * already present on the panel and moves them from "Available" to "Installed" in the
     * HOSKT theme addon list when the matching files/Blueprint records exist.
     */
    private const ADDONS = [
        'mcplugins' => [
            'name' => 'Minecraft Plugin Installer',
            'aliases' => ['MC Plugins', 'MC Plugin Installer', 'Minecraft Plugins Installer', 'Plugin Installer Manager'],
            'description' => 'Install and manage Minecraft plugins from the panel.',
            'paths' => [
                '.blueprint/extensions/mcplugins',
                'blueprint/extensions/mcplugins',
                'app/BlueprintFramework/Extensions/mcplugins',
                'resources/scripts/components/server/mcplugins',
                'public/extensions/mcplugins',
            ],
            'blueprint' => ['mcplugins'],
        ],
        'blueserverproperties' => [
            'name' => 'Blue Server Properties Editor',
            'aliases' => ['Blue Server Properties', 'Blue Server Properties Editor', 'Server Properties Editor', 'server.properties editor'],
            'description' => 'Minecraft server.properties editor.',
            'paths' => [
                '.blueprint/extensions/blueserverproperties',
                'blueprint/extensions/blueserverproperties',
                'app/BlueprintFramework/Extensions/blueserverproperties',
                'app/Http/Controllers/Api/Client/Servers/ServerConfigEditorController.php',
                'app/Http/Middleware/Api/Client/Server/MinecraftServerCheck.php',
                'resources/scripts/components/server/servercfg/ServerConfigEditor.tsx',
                'resources/scripts/components/server/servercfg',
            ],
            'blueprint' => ['blueserverproperties'],
        ],
        'minecraftplayermanager' => [
            'name' => 'Minecraft Player Manager',
            'aliases' => ['Minecraft Player Manager', 'Player Manager', 'Minecraft Players Manager'],
            'description' => 'Manage Minecraft Java players from the panel.',
            'paths' => [
                '.blueprint/extensions/minecraftplayermanager',
                'blueprint/extensions/minecraftplayermanager',
                'app/BlueprintFramework/Extensions/minecraftplayermanager',
                'resources/scripts/components/server/minecraftplayermanager',
                'public/extensions/minecraftplayermanager',
            ],
            'blueprint' => ['minecraftplayermanager'],
        ],
        'mcutils' => [
            'name' => 'McUtils',
            'aliases' => ['McUtils', 'Minecraft Utils', 'Minecraft Utilities'],
            'description' => 'Minecraft utility tools for server management.',
            'paths' => [
                '.blueprint/extensions/mcutils',
                'blueprint/extensions/mcutils',
                'app/BlueprintFramework/Extensions/mcutils',
                'app/MythicalSystems/McUtils',
                'resources/scripts/components/server/mcutils',
                'public/extensions/mcutils',
                'storage/extensions/mcutils',
            ],
            'blueprint' => ['mcutils'],
        ],
        'subdomain' => [
            'name' => 'SubDomain Manager',
            'aliases' => ['SubDomain', 'SubDomain Manager', 'Subdomain Manager', 'Sub Domain Manager'],
            'description' => 'Create and manage server subdomains.',
            'paths' => [
                'app/Http/Controllers/Admin/SubDomainController.php',
                'app/Http/Controllers/Api/Client/Servers/SubdomainController.php',
                'app/Http/Requests/Api/Client/Servers/SubdomainRequest.php',
                'app/Services/Servers/SubDomainDeletionService.php',
                'resources/scripts/components/server/subdomain/SubdomainContainer.tsx',
                'resources/views/admin/subdomain',
                'database/migrations/2019_10_13_23655_add_domains_table.php',
                'database/migrations/2019_10_13_23656_add_subdomains_table.php',
            ],
            'blueprint' => [],
        ],
        'freeservers' => [
            'name' => 'Free Servers',
            'aliases' => ['Free Servers', 'Free Server', 'Free Servers Addon'],
            'description' => 'Free server package/order addon.',
            'paths' => [
                'app/Console/Commands/Server/ManageFreeServersCommand.php',
                'app/Http/Controllers/Admin/FreeServersController.php',
                'app/Http/Controllers/Api/Client/FreeServersController.php',
                'resources/scripts/components/dashboard/freeservers/FreeServersContainer.tsx',
                'resources/views/admin/freeservers',
                'database/migrations/2021_12_16_094848_create_free_packages_table.php',
            ],
            'blueprint' => [],
        ],
        'minecraft-rcon-query-manager' => [
            'name' => 'Minecraft RCON Query Manager',
            'aliases' => ['Minecraft RCON Query Manager', 'Minecraft RCON Manager', 'RCON Query Manager', 'Minecraft RCON and Query Manager'],
            'description' => 'Manage Minecraft RCON and query settings.',
            'paths' => [
                'app/Http/Controllers/Api/Client/Servers/MinecraftRconController.php',
                'app/Http/Middleware/Api/Client/Server/IsMinecraft.php',
                'app/Http/Requests/Api/Client/Servers/Settings/MinecraftRconRequest.php',
                'resources/scripts/components/server/settings/MinecraftBox.tsx',
                'resources/scripts/api/server/rcon/loadRcon.ts',
                'database/migrations/2020_09_19_103252_add_rcon_column_to_servers_table.php',
            ],
            'blueprint' => [],
        ],
        'minecraft-bedrock-version-changer' => [
            'name' => 'Minecraft Bedrock Version Changer',
            'aliases' => ['Minecraft Bedrock Version Changer', 'Bedrock Version Changer', 'PocketMine Version Changer', 'Versions PE'],
            'description' => 'Install/change Minecraft Bedrock/PocketMine versions.',
            'paths' => [
                'app/Http/Controllers/Api/Client/Servers/VersionsPeController.php',
                'resources/scripts/components/server/versionspe/McVersionsPePocketMineContainer.tsx',
                'resources/scripts/components/server/versionspe',
                'resources/scripts/api/server/version/getMinecraftVersionPocketMine.ts',
            ],
            'blueprint' => [],
        ],
        'minecraft-mod-installer' => [
            'name' => 'Minecraft Mod Installer',
            'aliases' => ['Minecraft Mod Installer', 'Minecraft Mod Manager', 'Mod Manager', 'Mods Manager'],
            'description' => 'Search and install Minecraft mods from supported providers.',
            'paths' => [
                'app/Services/Mods/ModSearchService.php',
                'resources/scripts/components/server/mods',
                'app/Http/Controllers/Api/Client/Servers/ModController.php',
            ],
            'blueprint' => ['mcmods', 'mods', 'modmanager'],
        ],
        'minecraft-modpack-installer' => [
            'name' => 'Minecraft Modpack Installer',
            'aliases' => ['Minecraft Modpack Installer', 'Modpack Installer', 'Minecraft Modpacks Installer'],
            'description' => 'Install Minecraft modpacks from supported providers.',
            'paths' => [
                'app/Http/Controllers/Api/Client/Servers/ModpackController.php',
                'app/Jobs/Server/InstallModpackJob.php',
                'app/Services/Minecraft/Modpacks/AbstractModpackService.php',
                'resources/scripts/components/server/minecraft-modpacks/ModpacksContainer.tsx',
                'database/migrations/2025_04_15_150637_add_modpack_installations_table.php',
            ],
            'blueprint' => [],
        ],
        'minecraft-world-manager' => [
            'name' => 'Minecraft World Manager',
            'aliases' => ['Minecraft World Manager', 'World Manager', 'Minecraft Worlds Manager', 'Minecraft Map Manager'],
            'description' => 'Install and manage Minecraft worlds/maps.',
            'paths' => [
                'app/Http/Controllers/Api/Client/Servers/MinecraftWorldController.php',
                'app/Jobs/InstallMinecraftMapJob.php',
                'app/Services/Minecraft/Maps/AbstractMapService.php',
                'resources/scripts/components/server/minecraft-worlds/MinecraftWorldContainer.tsx',
                'resources/scripts/components/server/minecraft-worlds',
            ],
            'blueprint' => [],
        ],
        'minecraft-versions-modpacks-installer' => [
            'name' => 'Minecraft Versions & Modpacks Installer',
            'aliases' => ['Minecraft Versions & Modpacks Installer', 'Minecraft Versions Modpacks Installer', 'Minecraft Versions Changer', 'Minecraft Version Changer', 'Versions Changer', 'Bagou Versions', 'Bagou MC Versions'],
            'description' => 'Install/change Minecraft Java versions and modpacks.',
            'paths' => [
                'app/Http/Controllers/Api/Client/Servers/VersionsController.php',
                'app/Http/Controllers/Admin/Bagou/BagouCenterController.php',
                'app/Http/Controllers/Admin/Bagou/BagouVersionsController.php',
                'app/Models/Bagoulicense.php',
                'app/Models/MinecraftModpacks.php',
                'resources/scripts/components/server/versions/McVersionsContainer.tsx',
                'resources/views/admin/bagoucenter',
                'database/migrations/2022_05_21_133943_add_version_field_to_servers_table.php',
            ],
            'blueprint' => [],
        ],
    ];

    public static function boot(): void
    {
        try {
            View::composer('*', function (LaravelView $view): void {
                try {
                    $request = request();
                    if (!$request) {
                        return;
                    }

                    $path = trim((string) $request->path(), '/');
                    if ($path !== 'admin/settings/theme' && !str_starts_with($path, 'admin/settings/theme')) {
                        return;
                    }

                    $data = $view->getData();
                    if (!is_array($data) || $data === []) {
                        return;
                    }

                    $patched = self::patchViewData($data);
                    foreach ($patched as $key => $value) {
                        if (!array_key_exists($key, $data) || $data[$key] !== $value) {
                            $view->with($key, $value);
                        }
                    }
                } catch (\Throwable $e) {
                    // Never break the admin settings page because of the patch.
                }
            });
        } catch (\Throwable $e) {
            // Never break the application boot because of the patch.
        }
    }

    public static function patchViewData(array $data): array
    {
        $installed = self::installedAddons();
        if ($installed === []) {
            return $data;
        }

        $pairs = [
            ['installedAddons', 'availableAddons'],
            ['installed_addons', 'available_addons'],
            ['installedPlugins', 'availablePlugins'],
            ['installed_plugins', 'available_plugins'],
            ['installedExtensions', 'availableExtensions'],
            ['installed_extensions', 'available_extensions'],
        ];

        foreach ($pairs as [$installedKey, $availableKey]) {
            if (array_key_exists($installedKey, $data) && array_key_exists($availableKey, $data)) {
                [$data[$installedKey], $data[$availableKey]] = self::moveInstalledBetweenLists(
                    self::toArray($data[$installedKey]),
                    self::toArray($data[$availableKey]),
                    $installed
                );
            }
        }

        foreach (['addons', 'allAddons', 'pluginAddons', 'extensions', 'marketplaceAddons', 'availableToPurchase'] as $key) {
            if (array_key_exists($key, $data) && is_iterable($data[$key])) {
                $data[$key] = self::markInstalledInList(self::toArray($data[$key]), $installed);
            }
        }

        // Extra non-invasive variables for custom HOSKT views that read patch-specific data.
        $data['hosktAddonPatchInstalledIds'] = array_keys($installed);
        $data['hosktAddonPatchInstalledAddons'] = array_values(array_map(
            fn (array $addon): array => self::defaultEntry($addon, true),
            $installed
        ));

        return $data;
    }

    /** @return array<string,array<string,mixed>> */
    public static function installedAddons(): array
    {
        $installed = [];
        foreach (self::ADDONS as $id => $addon) {
            if (self::isAddonInstalled($id, $addon)) {
                $installed[$id] = $addon + ['identifier' => $id];
            }
        }

        return $installed;
    }

    private static function isAddonInstalled(string $id, array $addon): bool
    {
        foreach (($addon['blueprint'] ?? []) as $blueprintId) {
            if (self::isBlueprintInstalled((string) $blueprintId)) {
                return true;
            }
        }

        foreach (($addon['paths'] ?? []) as $path) {
            if (self::panelPathExists((string) $path)) {
                return true;
            }
        }

        return false;
    }

    private static function isBlueprintInstalled(string $identifier): bool
    {
        $roots = [
            '.blueprint/extensions/' . $identifier,
            'blueprint/extensions/' . $identifier,
            'app/BlueprintFramework/Extensions/' . $identifier,
            'resources/blueprint/extensions/' . $identifier,
        ];

        foreach ($roots as $path) {
            if (self::panelPathExists($path)) {
                return true;
            }
        }

        foreach (self::blueprintDbFiles() as $file) {
            if (!is_file($file) || !is_readable($file)) {
                continue;
            }

            $contents = (string) @file_get_contents($file);
            if ($contents === '') {
                continue;
            }

            if (self::containsIdentifier($contents, $identifier)) {
                return true;
            }
        }

        return false;
    }

    /** @return string[] */
    private static function blueprintDbFiles(): array
    {
        $base = self::basePath();

        return [
            $base . '/.blueprint/extensions/blueprint/private/db/installed_extensions',
            $base . '/blueprint/extensions/blueprint/private/db/installed_extensions',
            $base . '/storage/blueprint/installed_extensions',
        ];
    }

    private static function panelPathExists(string $path): bool
    {
        $absolute = self::basePath() . '/' . ltrim($path, '/');

        return file_exists($absolute) || is_dir($absolute);
    }

    private static function basePath(): string
    {
        try {
            if (function_exists('base_path')) {
                return rtrim((string) base_path(), '/');
            }
        } catch (\Throwable $e) {
        }

        return rtrim((string) getcwd(), '/');
    }

    /** @param iterable<mixed> $value */
    private static function toArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if ($value instanceof \Illuminate\Support\Collection) {
            return $value->all();
        }

        if ($value instanceof \Traversable) {
            return iterator_to_array($value);
        }

        return [];
    }

    /** @return array{0:array<int|string,mixed>,1:array<int|string,mixed>} */
    private static function moveInstalledBetweenLists(array $installedList, array $availableList, array $installedMap): array
    {
        $newInstalled = [];
        $newAvailable = [];

        foreach ($installedList as $key => $entry) {
            $matched = self::matchedAddonId($entry, $installedMap);
            $newInstalled[$key] = $matched ? self::markEntryInstalled($entry, $installedMap[$matched], true) : $entry;
        }

        foreach ($availableList as $key => $entry) {
            $matched = self::matchedAddonId($entry, $installedMap);
            if ($matched !== null) {
                $newInstalled[] = self::markEntryInstalled($entry, $installedMap[$matched], true);
            } else {
                $newAvailable[$key] = self::markEntryInstalled($entry, null, false);
            }
        }

        foreach ($installedMap as $id => $addon) {
            if (!self::listContainsAddon($newInstalled, $id, $addon)) {
                $newInstalled[] = self::defaultEntry($addon, true);
            }
        }

        return [self::uniqueAddonList($newInstalled), self::uniqueAddonList($newAvailable)];
    }

    private static function markInstalledInList(array $list, array $installedMap): array
    {
        foreach ($list as $key => $entry) {
            $matched = self::matchedAddonId($entry, $installedMap);
            if ($matched !== null) {
                $list[$key] = self::markEntryInstalled($entry, $installedMap[$matched], true);
            }
        }

        return $list;
    }

    private static function matchedAddonId(mixed $entry, array $addons): ?string
    {
        $haystack = self::normalize(self::entrySearchText($entry));
        if ($haystack === '') {
            return null;
        }

        foreach ($addons as $id => $addon) {
            $needles = array_merge([$id, $addon['name'] ?? ''], $addon['aliases'] ?? []);
            foreach ($needles as $needle) {
                $normalized = self::normalize((string) $needle);
                if ($normalized !== '' && str_contains($haystack, $normalized)) {
                    return (string) $id;
                }
            }
        }

        return null;
    }

    private static function listContainsAddon(array $list, string $id, array $addon): bool
    {
        $installedMap = [$id => $addon];
        foreach ($list as $entry) {
            if (self::matchedAddonId($entry, $installedMap) === $id) {
                return true;
            }
        }

        return false;
    }

    private static function uniqueAddonList(array $list): array
    {
        $seen = [];
        $result = [];
        foreach ($list as $entry) {
            $key = self::normalize(self::entrySearchText($entry));
            if ($key !== '' && isset($seen[$key])) {
                continue;
            }
            if ($key !== '') {
                $seen[$key] = true;
            }
            $result[] = $entry;
        }

        return $result;
    }

    private static function entrySearchText(mixed $entry): string
    {
        if (is_string($entry) || is_numeric($entry)) {
            return (string) $entry;
        }

        if (is_array($entry)) {
            $parts = [];
            foreach (['id', 'slug', 'identifier', 'key', 'name', 'title', 'label', 'display_name', 'displayName', 'route', 'url', 'description'] as $field) {
                if (isset($entry[$field]) && (is_string($entry[$field]) || is_numeric($entry[$field]))) {
                    $parts[] = (string) $entry[$field];
                }
            }

            if ($parts === []) {
                foreach ($entry as $value) {
                    if (is_string($value) || is_numeric($value)) {
                        $parts[] = (string) $value;
                    }
                }
            }

            return implode(' ', $parts);
        }

        if (is_object($entry)) {
            $parts = [];
            foreach (['id', 'slug', 'identifier', 'key', 'name', 'title', 'label', 'display_name', 'displayName', 'route', 'url', 'description'] as $field) {
                if (isset($entry->{$field}) && (is_string($entry->{$field}) || is_numeric($entry->{$field}))) {
                    $parts[] = (string) $entry->{$field};
                }
            }

            return implode(' ', $parts);
        }

        return '';
    }

    private static function markEntryInstalled(mixed $entry, ?array $addon, bool $installed): mixed
    {
        if (is_array($entry)) {
            $entry['installed'] = $installed;
            $entry['isInstalled'] = $installed;
            $entry['is_installed'] = $installed;
            $entry['status'] = $installed ? 'installed' : ($entry['status'] ?? 'available');

            if ($addon !== null) {
                $entry['identifier'] = $entry['identifier'] ?? ($addon['identifier'] ?? null);
                $entry['slug'] = $entry['slug'] ?? ($addon['identifier'] ?? null);
                $entry['name'] = $entry['name'] ?? ($addon['name'] ?? null);
                $entry['title'] = $entry['title'] ?? ($addon['name'] ?? null);
                $entry['description'] = $entry['description'] ?? ($addon['description'] ?? '');
            }

            return $entry;
        }

        if (is_object($entry)) {
            try {
                $entry->installed = $installed;
                $entry->isInstalled = $installed;
                $entry->is_installed = $installed;
                $entry->status = $installed ? 'installed' : ($entry->status ?? 'available');
            } catch (\Throwable $e) {
            }

            return $entry;
        }

        return $entry;
    }

    private static function defaultEntry(array $addon, bool $installed): array
    {
        $identifier = (string) ($addon['identifier'] ?? self::normalize($addon['name'] ?? 'addon'));

        return [
            'id' => $identifier,
            'slug' => $identifier,
            'identifier' => $identifier,
            'name' => (string) ($addon['name'] ?? $identifier),
            'title' => (string) ($addon['name'] ?? $identifier),
            'description' => (string) ($addon['description'] ?? ''),
            'installed' => $installed,
            'isInstalled' => $installed,
            'is_installed' => $installed,
            'status' => $installed ? 'installed' : 'available',
        ];
    }

    private static function containsIdentifier(string $contents, string $identifier): bool
    {
        $identifier = self::normalize($identifier);
        if ($identifier === '') {
            return false;
        }

        $decoded = json_decode($contents, true);
        if (is_array($decoded)) {
            $flat = self::normalize(json_encode($decoded));
            return str_contains($flat, $identifier);
        }

        foreach (preg_split('/\R+/', $contents) ?: [] as $line) {
            if (self::normalize($line) === $identifier || str_contains(self::normalize($line), $identifier)) {
                return true;
            }
        }

        return str_contains(self::normalize($contents), $identifier);
    }

    private static function normalize(string $value): string
    {
        return strtolower((string) preg_replace('/[^a-zA-Z0-9]+/', '', $value));
    }
}
