<?php

declare(strict_types=1);

namespace Pterodactyl\Models {
    class Server
    {
        public int $id = 42;
    }
}

namespace Ramsey\Uuid {
    final class FakeUuid
    {
        public function toString(): string
        {
            return '11111111-2222-3333-4444-555555555555';
        }
    }

    final class Uuid
    {
        public static function uuid4(): FakeUuid
        {
            return new FakeUuid();
        }
    }
}

namespace Pterodactyl\Repositories\Wings {
    use Pterodactyl\Models\Server;

    class DaemonFileRepository
    {
        /** @var array<string, bool> */
        public array $nodes = ['' => true];
        public bool $validArchive = true;

        public function setServer(Server $server): self
        {
            return $this;
        }

        public function createDirectory(string $name, string $path): self
        {
            $this->addDirectory($this->join($path, $name));
            return $this;
        }

        public function pull(string $url, ?string $directory, array $params = []): self
        {
            $this->addFile($this->join((string) $directory, (string) ($params['filename'] ?? 'source.zip')));
            return $this;
        }

        public function decompressFile(?string $root, string $file): self
        {
            $root = $this->normalise((string) $root);
            if ($this->validArchive) {
                $this->addDirectory($this->join($root, 'AdventureWorld'));
                $this->addFile($this->join($root, 'AdventureWorld/level.dat'));
                $this->addDirectory($this->join($root, 'AdventureWorld/region'));
                $this->addFile($this->join($root, 'AdventureWorld/region/r.0.0.mca'));
            } else {
                $this->addFile($this->join($root, 'README.txt'));
            }
            return $this;
        }

        public function getDirectory(string $path): array
        {
            $path = $this->normalise($path);
            $prefix = $path === '' ? '' : $path . '/';
            $children = [];

            foreach ($this->nodes as $node => $directory) {
                if ($node === '' || !str_starts_with($node, $prefix)) {
                    continue;
                }
                $remaining = substr($node, strlen($prefix));
                if ($remaining === '' || str_contains($remaining, '/')) {
                    continue;
                }
                $children[] = ['name' => $remaining, 'directory' => $directory, 'is_symlink' => false];
            }

            return $children;
        }

        public function renameFiles(?string $root, array $files): self
        {
            $root = $this->normalise((string) $root);
            foreach ($files as $move) {
                $from = $this->join($root, (string) $move['from']);
                $to = $this->join($root, (string) $move['to']);
                $updates = [];
                foreach ($this->nodes as $node => $directory) {
                    if ($node === $from || str_starts_with($node, $from . '/')) {
                        $updates[$to . substr($node, strlen($from))] = $directory;
                        unset($this->nodes[$node]);
                    }
                }
                foreach ($updates as $node => $directory) {
                    $this->nodes[$node] = $directory;
                }
            }
            return $this;
        }

        public function deleteFiles(?string $root, array $files): self
        {
            $root = $this->normalise((string) $root);
            foreach ($files as $file) {
                $target = $this->join($root, (string) $file);
                foreach (array_keys($this->nodes) as $node) {
                    if ($node === $target || str_starts_with($node, $target . '/')) {
                        unset($this->nodes[$node]);
                    }
                }
            }
            return $this;
        }

        private function addDirectory(string $path): void
        {
            $path = $this->normalise($path);
            if ($path === '') {
                return;
            }
            $parent = dirname($path);
            if ($parent !== '.' && $parent !== '') {
                $this->addDirectory($parent);
            }
            $this->nodes[$path] = true;
        }

        private function addFile(string $path): void
        {
            $path = $this->normalise($path);
            $parent = dirname($path);
            if ($parent !== '.' && $parent !== '') {
                $this->addDirectory($parent);
            }
            $this->nodes[$path] = false;
        }

        private function join(string $parent, string $child): string
        {
            $parent = $this->normalise($parent);
            $child = $this->normalise($child);
            return $parent === '' ? $child : ($child === '' ? $parent : $parent . '/' . $child);
        }

        private function normalise(string $path): string
        {
            return trim(str_replace('\\', '/', $path), '/');
        }
    }
}

namespace {
    final class TestLogger
    {
        public function info(string $message, array $context = []): void {}
        public function error(string $message, array $context = []): void {}
        public function warning(string $message, array $context = []): void {}
    }

    function logger(): TestLogger
    {
        static $logger;
        return $logger ??= new TestLogger();
    }

    require dirname(__DIR__) . '/payload/files/app/Services/Minecraft/Maps/WorldArchiveInstaller.php';

    use Pterodactyl\Models\Server;
    use Pterodactyl\Repositories\Wings\DaemonFileRepository;
    use Pterodactyl\Services\Minecraft\Maps\WorldArchiveInstaller;

    $repository = new DaemonFileRepository();
    $installer = new WorldArchiveInstaller($repository);
    $installed = $installer->installFromUrl(new Server(), 'https://cdn.example.test/map.zip', 'map.zip', 'fallback');

    if ($installed !== ['AdventureWorld'] || !isset($repository->nodes['AdventureWorld/level.dat'])) {
        fwrite(STDERR, "Valid archive installation test failed.\n");
        exit(1);
    }
    foreach (array_keys($repository->nodes) as $node) {
        if (str_starts_with($node, '.hoskt-world-install-')) {
            fwrite(STDERR, "Staging cleanup test failed.\n");
            exit(1);
        }
    }

    $invalidRepository = new DaemonFileRepository();
    $invalidRepository->validArchive = false;
    $invalidInstaller = new WorldArchiveInstaller($invalidRepository);
    $failedAsExpected = false;
    try {
        $invalidInstaller->installFromUrl(new Server(), 'https://cdn.example.test/not-a-world.zip', 'not-a-world.zip', 'fallback');
    } catch (RuntimeException $exception) {
        $failedAsExpected = str_contains($exception->getMessage(), 'level.dat or uid.dat');
    }

    if (!$failedAsExpected) {
        fwrite(STDERR, "Invalid archive rejection test failed.\n");
        exit(1);
    }

    echo "OK: WorldArchiveInstaller installs valid worlds, rejects invalid archives, and cleans staging.\n";
}
