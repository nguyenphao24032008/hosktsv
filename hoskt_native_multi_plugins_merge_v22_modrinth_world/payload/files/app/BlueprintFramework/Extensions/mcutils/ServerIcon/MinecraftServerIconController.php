<?php


namespace Pterodactyl\BlueprintFramework\Extensions\mcutils\ServerIcon;


use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Request;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;

class MinecraftServerIconController extends ClientApiController
{
    public function __construct(
        private DaemonFileRepository $fileRepository,
    ) {
        parent::__construct();
    }

    private function resizeImage(string $sourcePath, string $destinationPath, int $maxWidth, int $maxHeight): void
    {
        if (!file_exists($sourcePath)) {
            throw new \RuntimeException('Source image file does not exist.');
        }

        $imageInfo = getimagesize($sourcePath);
        if ($imageInfo === false) {
            throw new \RuntimeException('Invalid image file.');
        }

        [$originalWidth, $originalHeight, $imageType] = $imageInfo;

        $newImage = imagecreatetruecolor($maxWidth, $maxHeight);
        if ($newImage === false) {
            throw new \RuntimeException('Failed to create new image.');
        }

        if ($imageType === IMAGETYPE_PNG) {
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
            $transparent = imagecolorallocatealpha($newImage, 0, 0, 0, 127);
            imagefilledrectangle($newImage, 0, 0, $maxWidth, $maxHeight, $transparent);
        }

        $sourceImage = match ($imageType) {
            IMAGETYPE_JPEG => imagecreatefromjpeg($sourcePath),
            IMAGETYPE_PNG => imagecreatefrompng($sourcePath),
            default => throw new \RuntimeException('Unsupported image type.'),
        };

        if ($sourceImage === false) {
            throw new \RuntimeException('Failed to load source image.');
        }

        if (!imagecopyresampled($newImage, $sourceImage, 0, 0, 0, 0, $maxWidth, $maxHeight, $originalWidth, $originalHeight)) {
            throw new \RuntimeException('Failed to resize image.');
        }

        if (!imagepng($newImage, $destinationPath)) {
            throw new \RuntimeException('Failed to save image.');
        }

        imagedestroy($newImage);
        imagedestroy($sourceImage);
    }

    public function index(Request $request, Server $server): JsonResponse
    {
        return response()->json(['minecraft' => true]);
    }

    // @php-ignore PHP0418
    public function update(MinecraftServerIconUpdateRequest $request, Server $server): JsonResponse
    {
        try {
            $imageData = base64_decode($request->input('image'));
            if (empty($imageData)) {
                return response()->json(['error' => 'No image data provided.'], \Symfony\Component\HttpFoundation\Response::HTTP_BAD_REQUEST);
            }
            if (strlen($imageData) > 1024 * 1024 * 15) {
                return response()->json(['error' => 'Image size is too large.'], JsonResponse::HTTP_BAD_REQUEST);
            }

            $temporaryDirectory = storage_path('extensions/mcutils');
            $temporaryOldFile = sprintf('%s/%s-%s.old', $temporaryDirectory, $server->id, time());
            $temporaryFile = sprintf('%s/%s-%s.png', $temporaryDirectory, $server->id, time());

            file_put_contents($temporaryOldFile, $imageData);

            $imageType = exif_imagetype($temporaryOldFile);
            if (!in_array($imageType, [IMAGETYPE_PNG, IMAGETYPE_JPEG])) {
                return response()->json(['error' => 'Invalid image type provided.'], JsonResponse::HTTP_BAD_REQUEST);
            }

            try {
                $this->resizeImage($temporaryOldFile, $temporaryFile, 64, 64);
                $this->fileRepository->setServer($server)->putContent('server-icon.png', file_get_contents($temporaryFile));
            } finally {
                unlink($temporaryOldFile);
                unlink($temporaryFile);
            }

            return response()->json([], JsonResponse::HTTP_NO_CONTENT);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
