<?php

namespace Pterodactyl\Services\Minecraft\Maps;

use Pterodactyl\Models\Server;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Ramsey\Uuid\Uuid;
use RuntimeException;
use Throwable;

/**
 * Downloads and installs a Minecraft world without extracting arbitrary archive
 * contents directly into the server root.
 */
final class WorldArchiveInstaller
{
    private const MAX_SCAN_DEPTH = 10;
    private const MAX_SCAN_ENTRIES = 6000;
    private const MAX_NESTED_ARCHIVES = 12;

    public function __construct(private DaemonFileRepository $daemonFileRepository)
    {
    }

    /**
     * @return string[] Names of the world directories installed in the server root.
     */
    public function installFromUrl(
        Server $server,
        string $downloadUrl,
        string $sourceFilename,
        string $fallbackWorldName
    ): array {
        $this->validateDownloadUrl($downloadUrl);

        $archiveName = $this->normaliseArchiveName($sourceFilename);
        $stageDirectory = '.hoskt-world-install-' . substr(str_replace('-', '', Uuid::uuid4()->toString()), 0, 20);
        $repository = $this->daemonFileRepository->setServer($server);

        try {
            $repository->createDirectory($stageDirectory, '/');
            $repository->pull($downloadUrl, $stageDirectory, [
                'filename' => $archiveName,
                'foreground' => true,
            ]);

            $repository->decompressFile($stageDirectory, $archiveName);
            $this->deleteIgnoringErrors($stageDirectory, [$archiveName]);

            $worldDirectories = $this->findWorldDirectories($stageDirectory);
            if ($worldDirectories === []) {
                $worldDirectories = $this->extractNestedArchivesAndFindWorlds($stageDirectory);
            }

            if ($worldDirectories === []) {
                throw new RuntimeException(
                    'The downloaded archive does not contain a valid Minecraft world (level.dat or uid.dat was not found).'
                );
            }

            $installed = $this->moveWorldsToServerRoot(
                $stageDirectory,
                $worldDirectories,
                $fallbackWorldName
            );

            if ($installed === []) {
                throw new RuntimeException('A valid world was detected, but it could not be moved into the server root.');
            }

            logger()->info('Minecraft world archive installed.', [
                'server_id' => $server->id,
                'source_filename' => $sourceFilename,
                'installed_worlds' => $installed,
            ]);

            return $installed;
        } catch (Throwable $exception) {
            logger()->error('Minecraft world archive installation failed.', [
                'server_id' => $server->id,
                'source_filename' => $sourceFilename,
                'exception' => $exception->getMessage(),
            ]);

            if ($exception instanceof RuntimeException) {
                throw $exception;
            }

            throw new RuntimeException('Unable to download or install the selected Minecraft world.', 0, $exception);
        } finally {
            $this->deleteIgnoringErrors('/', [$stageDirectory]);
        }
    }

    private function validateDownloadUrl(string $url): void
    {
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));

        if (!in_array($scheme, ['http', 'https'], true) || empty($parts['host'])) {
            throw new RuntimeException('The provider returned an invalid world download URL.');
        }
    }

    private function normaliseArchiveName(string $filename): string
    {
        $filename = trim(basename(str_replace('\\', '/', $filename)));
        $lower = strtolower($filename);

        // A Modrinth .mrpack is a ZIP archive. Giving it a .zip name allows Wings
        // versions that do not explicitly recognise .mrpack to decompress it.
        if (str_ends_with($lower, '.mrpack')) {
            return 'source.zip';
        }
        if (str_ends_with($lower, '.tar.gz')) {
            return 'source.tar.gz';
        }
        if (str_ends_with($lower, '.tgz')) {
            return 'source.tgz';
        }
        if (str_ends_with($lower, '.tar')) {
            return 'source.tar';
        }
        if (str_ends_with($lower, '.zip')) {
            return 'source.zip';
        }

        throw new RuntimeException('The selected file is not a supported ZIP, TAR, TGZ, or MRPACK archive.');
    }

    /**
     * @return string[]
     */
    private function findWorldDirectories(string $root): array
    {
        $visitedEntries = 0;
        $worlds = [];
        $this->scanForWorlds($root, 0, $visitedEntries, $worlds);

        return array_values(array_unique($worlds));
    }

    /**
     * @param string[] $worlds
     */
    private function scanForWorlds(string $path, int $depth, int &$visitedEntries, array &$worlds): void
    {
        if ($depth > self::MAX_SCAN_DEPTH || $visitedEntries >= self::MAX_SCAN_ENTRIES) {
            return;
        }

        $items = $this->daemonFileRepository->getDirectory($path);
        $hasWorldMarker = false;

        foreach ($items as $item) {
            ++$visitedEntries;
            if ($visitedEntries > self::MAX_SCAN_ENTRIES) {
                return;
            }

            if ($this->isDirectory($item)) {
                continue;
            }

            $name = strtolower((string) ($item['name'] ?? ''));
            if ($name === 'level.dat' || $name === 'uid.dat') {
                $hasWorldMarker = true;
            }
        }

        if ($hasWorldMarker) {
            $worlds[] = trim($path, '/');
            return;
        }

        foreach ($items as $item) {
            if (!$this->isDirectory($item) || !empty($item['is_symlink'])) {
                continue;
            }

            $name = (string) ($item['name'] ?? '');
            if ($name === '') {
                continue;
            }

            $this->scanForWorlds($this->joinPath($path, $name), $depth + 1, $visitedEntries, $worlds);
        }
    }

    /**
     * @return string[]
     */
    private function extractNestedArchivesAndFindWorlds(string $root): array
    {
        $archives = $this->findNestedArchives($root);
        $attempted = 0;

        foreach ($archives as $archive) {
            if (++$attempted > self::MAX_NESTED_ARCHIVES) {
                break;
            }

            $directory = $archive['directory'];
            $filename = $archive['filename'];
            $decompressName = $filename;

            try {
                if (str_ends_with(strtolower($filename), '.mrpack')) {
                    $decompressName = preg_replace('/\.mrpack$/i', '.zip', $filename) ?: ($filename . '.zip');
                    $this->daemonFileRepository->renameFiles($directory, [[
                        'from' => $filename,
                        'to' => $decompressName,
                    ]]);
                }

                $this->daemonFileRepository->decompressFile($directory, $decompressName);
                $this->deleteIgnoringErrors($directory, [$decompressName]);
            } catch (Throwable $exception) {
                logger()->warning('Unable to extract a nested world archive.', [
                    'archive' => $this->joinPath($directory, $filename),
                    'exception' => $exception->getMessage(),
                ]);
                continue;
            }

            $worlds = $this->findWorldDirectories($root);
            if ($worlds !== []) {
                return $worlds;
            }
        }

        return [];
    }

    /**
     * @return array<int, array{directory: string, filename: string, score: int}>
     */
    private function findNestedArchives(string $root): array
    {
        $visitedEntries = 0;
        $archives = [];
        $this->scanForArchives($root, 0, $visitedEntries, $archives);

        usort($archives, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return $archives;
    }

    /**
     * @param array<int, array{directory: string, filename: string, score: int}> $archives
     */
    private function scanForArchives(string $path, int $depth, int &$visitedEntries, array &$archives): void
    {
        if ($depth > self::MAX_SCAN_DEPTH || $visitedEntries >= self::MAX_SCAN_ENTRIES) {
            return;
        }

        $items = $this->daemonFileRepository->getDirectory($path);
        foreach ($items as $item) {
            ++$visitedEntries;
            if ($visitedEntries > self::MAX_SCAN_ENTRIES) {
                return;
            }

            $name = (string) ($item['name'] ?? '');
            if ($name === '') {
                continue;
            }

            if ($this->isDirectory($item)) {
                if (empty($item['is_symlink'])) {
                    $this->scanForArchives($this->joinPath($path, $name), $depth + 1, $visitedEntries, $archives);
                }
                continue;
            }

            if (!$this->isSupportedArchive($name)) {
                continue;
            }

            $lower = strtolower($name);
            $score = preg_match('/(?:map|world|save)/i', $lower) ? 100 : 0;
            $score += str_ends_with($lower, '.zip') || str_ends_with($lower, '.mrpack') ? 20 : 10;

            $archives[] = [
                'directory' => trim($path, '/'),
                'filename' => $name,
                'score' => $score,
            ];
        }
    }

    /**
     * @param string[] $worldDirectories
     * @return string[]
     */
    private function moveWorldsToServerRoot(
        string $stageDirectory,
        array $worldDirectories,
        string $fallbackWorldName
    ): array {
        $usedNames = [];
        foreach ($this->daemonFileRepository->getDirectory('/') as $item) {
            $name = strtolower((string) ($item['name'] ?? ''));
            if ($name !== '') {
                $usedNames[$name] = true;
            }
        }

        $installed = [];
        foreach ($worldDirectories as $worldDirectory) {
            $worldDirectory = trim($worldDirectory, '/');
            $baseName = basename($worldDirectory);
            if ($worldDirectory === trim($stageDirectory, '/') || $baseName === '.' || $baseName === '') {
                $baseName = $fallbackWorldName;
            }

            $targetName = $this->uniqueWorldName($baseName, $fallbackWorldName, $usedNames);

            if ($worldDirectory === trim($stageDirectory, '/')) {
                $this->daemonFileRepository->createDirectory($targetName, '/');
                $moves = [];
                foreach ($this->daemonFileRepository->getDirectory($stageDirectory) as $item) {
                    $name = (string) ($item['name'] ?? '');
                    if ($name === '') {
                        continue;
                    }

                    $moves[] = [
                        'from' => $this->joinPath($stageDirectory, $name),
                        'to' => $this->joinPath($targetName, $name),
                    ];
                }

                if ($moves === []) {
                    throw new RuntimeException('The detected world directory is empty.');
                }

                $this->daemonFileRepository->renameFiles('/', $moves);
            } else {
                $this->daemonFileRepository->renameFiles('/', [[
                    'from' => $worldDirectory,
                    'to' => $targetName,
                ]]);
            }

            $usedNames[strtolower($targetName)] = true;
            $installed[] = $targetName;
        }

        return $installed;
    }

    /**
     * @param array<string, bool> $usedNames
     */
    private function uniqueWorldName(string $preferredName, string $fallbackName, array $usedNames): string
    {
        $base = $this->sanitizeWorldName($preferredName);
        if ($base === '') {
            $base = $this->sanitizeWorldName($fallbackName);
        }
        if ($base === '') {
            $base = 'modrinth-world';
        }

        $candidate = $base;
        $suffix = 2;
        while (isset($usedNames[strtolower($candidate)])) {
            $candidate = $base . '-' . $suffix++;
        }

        return $candidate;
    }

    private function sanitizeWorldName(string $name): string
    {
        $name = trim($name);
        $name = preg_replace('/[^A-Za-z0-9._-]+/u', '-', $name) ?? '';
        $name = trim($name, '.-_');

        return substr($name, 0, 80);
    }

    private function isSupportedArchive(string $filename): bool
    {
        $lower = strtolower($filename);

        return str_ends_with($lower, '.zip')
            || str_ends_with($lower, '.mrpack')
            || str_ends_with($lower, '.tar')
            || str_ends_with($lower, '.tar.gz')
            || str_ends_with($lower, '.tgz');
    }

    private function isDirectory(array $item): bool
    {
        if (array_key_exists('directory', $item)) {
            return (bool) $item['directory'];
        }
        if (array_key_exists('is_file', $item)) {
            return !(bool) $item['is_file'];
        }

        return str_starts_with((string) ($item['mode'] ?? ''), 'd');
    }

    private function joinPath(string $parent, string $child): string
    {
        $parent = trim($parent, '/');
        $child = trim($child, '/');

        return $parent === '' ? $child : $parent . '/' . $child;
    }

    /**
     * @param string[] $files
     */
    private function deleteIgnoringErrors(string $root, array $files): void
    {
        try {
            $this->daemonFileRepository->deleteFiles($root, $files);
        } catch (Throwable) {
            // Cleanup must never hide the original installation error.
        }
    }
}
