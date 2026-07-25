import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import tw from 'twin.macro';
import GreyRowBox from '@/components/elements/GreyRowBox';
import { ServerContext } from '@/state/server';
import Button from '@/components/elements/Button';
import deleteFiles from '@/api/server/files/deleteFiles';
import { ApplicationStore } from '@/state';
import { Actions, useStoreActions } from 'easy-peasy';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import setSelectedDockerImage from '@/api/server/setSelectedDockerImage';
import InstallMinecraftVersion from '@/api/server/version/InstallMinecraftVersion';
import getVersionFileSize from '@/api/server/version/getVersionFileSize';
import decompressFiles from '@/api/server/files/decompressFiles';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { bytesToString } from '@/lib/formatters';
import renameFiles from '@/api/server/files/renameFiles';

interface Props {
  minecraftVersions: any;
  className?: string;
  stype: string;
  type: string;
  modpacktype: string;
}

export default ({ minecraftVersions, className, stype, type, modpacktype }: Props) => {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const [disabled, setDisabled] = useState(false);
  const { addFlash, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);
  const [visible, setVisible] = useState(false);
  const [pourcentage, setPourcentage] = useState('');
  const name = stype.charAt(0).toUpperCase() + stype.slice(1) + ' ' + minecraftVersions.version;
  const versionIconCdn: Record<string, string> = {
    vanilla: 'https://cdn.nguyenhung401.id.vn/img/vanilla-icon.jpg',
    snapshot: 'https://cdn.nguyenhung401.id.vn/img/snapshot-icon.jpg',
    spigot: 'https://cdn.nguyenhung401.id.vn/img/spigot-icon.jpg',
    paper: 'https://cdn.nguyenhung401.id.vn/img/paper-icon.jpg',
    purpur: 'https://cdn.nguyenhung401.id.vn/img/purpur-icon.jpg',
    sponge: 'https://cdn.nguyenhung401.id.vn/img/sponge-icon.jpg',
    bungeecord: 'https://cdn.nguyenhung401.id.vn/img/bungeecord-icon.jpg',
    waterfall: 'https://cdn.nguyenhung401.id.vn/img/waterfall-icon.jpg',
    velocity: 'https://cdn.nguyenhung401.id.vn/img/velocity-icon.jpg',
    forge: 'https://cdn.nguyenhung401.id.vn/img/forge-icon.jpg',
    fabric: 'https://cdn.nguyenhung401.id.vn/img/fabric-icon.jpg',
    mohist: 'https://cdn.nguyenhung401.id.vn/img/mohist-icon.jpg',
    magma: 'https://cdn.nguyenhung401.id.vn/img/magma-icon.jpg',
    catserver: 'https://cdn.nguyenhung401.id.vn/img/catserver-icon.jpg',
    others: 'https://cdn.nguyenhung401.id.vn/img/others-icon.jpg',
    modpacks: 'https://cdn.nguyenhung401.id.vn/img/Modrinth-icon.png',
  };
  const localVanillaPng = '/extensions/hoskt-native-version-manager/icons/vanilla-icon.png?v=22.3';
  const localIcon = `/extensions/hoskt-native-version-manager/icons/${stype}.svg?v=22.3`;
  const fallbackIcon = '/extensions/hoskt-native-version-manager/icons/default.svg?v=22.3';
  const providerRemoteIcon = [
    minecraftVersions.icon_url,
    minecraftVersions.iconUrl,
    minecraftVersions.icon,
    minecraftVersions.image_url,
    minecraftVersions.image,
    minecraftVersions.logo,
  ].find((value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim())) as string | undefined;
  const remoteIcon = versionIconCdn[stype] || providerRemoteIcon;
  const initialIcon = remoteIcon || localIcon;

  const inferLegacyJava = (): number => {
    const value = String(stype === 'modpacks' ? minecraftVersions.mcversion || '' : minecraftVersions.version || '');
    const match = value.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) return 8;

    const major = Number(match[1] || 0);
    const minor = Number(match[2] || 0);
    const patch = Number(match[3] || 0);

    if (major >= 26 || major > 1) return 25;
    if (minor >= 21 || (minor === 20 && patch >= 5)) return 21;
    if (minor >= 18) return 17;
    if (minor === 17) return 16;
    return 8;
  };

  const dockerImageForJava = (javaValue: unknown): string => {
    const java = Number(javaValue) || inferLegacyJava();
    if (java >= 25) return 'ghcr.io/pterodactyl/yolks:java_25';
    if (java >= 21) return 'ghcr.io/pterodactyl/yolks:java_21';
    if (java >= 17) return 'ghcr.io/pterodactyl/yolks:java_17';
    if (java >= 16) return 'ghcr.io/pterodactyl/yolks:java_16';
    if (java >= 11) return 'ghcr.io/pterodactyl/yolks:java_11';
    return 'ghcr.io/pterodactyl/yolks:java_8';
  };

  const legacyFilename = (): string => {
    let filename =
      stype === 'forge' || stype === 'fabric' || stype === 'modpacks'
        ? modpacktype === 'others'
          ? String(minecraftVersions.url || '').replace(/^.*[\\/]/, '')
          : `${minecraftVersions.version}.zip`
        : stype === 'magma'
          ? `${minecraftVersions.version}.jar`
          : `${minecraftVersions.version}`;

    if (stype === 'mohist') filename = `${minecraftVersions.version}`;
    return filename;
  };

  function clear() {
    clearFlashes();
  }

  const installFailed = (error: unknown) => {
    addFlash({
      key: 'server:minecraftVersion',
      type: 'error',
      message: "Can't install the version.",
    });
    console.log(error);
    setDisabled(false);
    setTimeout(clear, 3000);
  };

  const finishDownloadedVersion = async (
    filename: string,
    archive: boolean,
    javaValue: unknown
  ): Promise<void> => {
    if (archive) {
      setPourcentage('Decompress files...');
      await decompressFiles(uuid, '/', filename);
      setPourcentage('Delete compressed file...');
      await deleteFiles(uuid, '/', [filename]);
    } else if (filename !== 'server.jar') {
      setPourcentage('Rename files...');
      await renameFiles(uuid, '/', [{ from: filename, to: 'server.jar' }]);
    }

    setPourcentage('Change java version...');
    await setSelectedDockerImage(uuid, dockerImageForJava(javaValue));
    addFlash({
      key: 'server:minecraftVersion',
      type: 'success',
      message: 'Version changed successfully',
    });
    setDisabled(false);
    setTimeout(clear, 3000);
  };

  const finishBootstrapVersion = async (javaValue: unknown, note?: string): Promise<void> => {
    setPourcentage('Change java version...');
    await setSelectedDockerImage(uuid, dockerImageForJava(javaValue));
    addFlash({
      key: 'server:minecraftVersion',
      type: 'success',
      message: note || 'Installer prepared successfully. Start the server once to complete setup.',
    });
    setDisabled(false);
    setTimeout(clear, 7000);
  };

  const Install = () => {
    setVisible(false);
    setDisabled(true);
    setPourcentage('Delete old versions...');
    deleteFiles(uuid, '/', ['server.jar', 'zip.zip', 'BuildTools.jar', 'forge-installer.jar', '.hoskt-forge-installed', 'libraries', 'fontfiles', 'worldshape', 'oresources', 'resources', 'structures', 'scripts', 'unix_args.txt', 'user_jvm_args.txt', 'config', 'mods'])
      .then(() => {
        InstallMinecraftVersion(
          uuid,
          type.charAt(0).toUpperCase() + type.slice(1) + ' ' + minecraftVersions.version,
          stype,
          minecraftVersions,
          type
        )
          .then((data) => {
            setPourcentage('Setup requirements...');

            const result = typeof data === 'object' && data !== null ? data : { size: data };
            const filename = String(result.filename || legacyFilename());
            const expectedSize = Number(result.size || 0);
            const archive =
              typeof result.archive === 'boolean'
                ? result.archive
                : /(?:\.tar\.xz|\.tar\.gz|\.zip)$/i.test(filename);
            const java = result.java || minecraftVersions.java || inferLegacyJava();

            // Native V18 downloads run through Wings in foreground mode, so the
            // file is complete when this response arrives. Legacy Bagou results
            // remain numeric and keep their original file-size polling path.
            if (result.bootstrap === true) {
              finishBootstrapVersion(java, String(result.note || '')).catch(installFailed);
              return;
            }

            if (result.completed === true) {
              finishDownloadedVersion(filename, archive, java).catch(installFailed);
              return;
            }

            let oldsize = 0;
            const download = setInterval(() => {
              getVersionFileSize(uuid, filename)
                .then((size) => {
                  const downloading = expectedSize > 0 ? size < expectedSize : size === 0;
                  if (downloading) {
                    setPourcentage(
                      `Download in progress ${bytesToString(size)}/${bytesToString(expectedSize)} (${bytesToString(
                        Math.max(0, size - oldsize)
                      )}/s)`
                    );
                    oldsize = size;
                    return;
                  }

                  clearInterval(download);
                  finishDownloadedVersion(filename, archive, java).catch(installFailed);
                })
                .catch((error) => {
                  clearInterval(download);
                  installFailed(error);
                });
            }, 1000);
          })
          .catch(installFailed);
      })
      .catch(installFailed);
  };
  return (
    <GreyRowBox css={tw`grid grid-rows-2`} className={className}>
      <SpinnerOverlay fixed={true} size={'large'} visible={disabled}>
        <div css={tw`text-white mt-2`}>{pourcentage}</div>
      </SpinnerOverlay>
      <ConfirmationModal
        visible={visible}
        title={`Install the ${name}?`}
        buttonText={'Install'}
        onConfirmed={() => Install()}
        onModalDismissed={() => setVisible(false)}
      >
        {(stype === 'spigot' || stype === 'forge') && (
          <p css={tw`text-yellow-300 mb-2`}>
            The installer is prepared now and finishes on the first server start. Spigot uses official BuildTools; Forge installs its libraries automatically.
          </p>
        )}
        <p css={tw`text-neutral-300`}>This action remove server.jar,libraries,mods,resources,scripts,fontfiles,oresources and config folder from the server.</p>
        <p css={tw`text-neutral-300`}>Are you sure you want to continue?</p>
      </ConfirmationModal>
      <div css={tw`mx-auto`}>
        <div css={tw`flex`}>
          <img
            src={initialIcon}
            alt={`${stype} icon`}
            loading='lazy'
            referrerPolicy='no-referrer'
            data-fallback-stage={remoteIcon ? 'remote' : 'local'}
            css={tw`mr-3 h-8 w-8 rounded object-contain`}
            onError={(event) => {
              const stage = event.currentTarget.dataset.fallbackStage;
              if (stage === 'remote' && stype === 'vanilla') {
                event.currentTarget.dataset.fallbackStage = 'vanilla-local-png';
                event.currentTarget.src = localVanillaPng;
                return;
              }
              if (stage === 'remote' || stage === 'vanilla-local-png') {
                event.currentTarget.dataset.fallbackStage = 'local';
                event.currentTarget.src = localIcon;
                return;
              }
              if (stage === 'local') {
                event.currentTarget.dataset.fallbackStage = 'default';
                event.currentTarget.src = fallbackIcon;
              }
            }}
          />
            {stype === 'modpacks' ? (
              <p css={tw`my-auto`}>
                {modpacktype === 'others' ? minecraftVersions.name : minecraftVersions.version}{' : '}
                <span css={tw`text-cyan-600`}>{minecraftVersions.mcversion} </span>
              </p>
            ):(
              <p css={tw`my-auto`}>
                {stype.charAt(0).toUpperCase() + stype.slice(1) + ': '}
                <span css={tw`text-cyan-600`}>{minecraftVersions.version} </span>
              </p>
            )}

        </div>
      </div>
      <div css={tw`mx-auto mt-2`}>
        <Button
          type={'button'}
          color={'grey'}
          isSecondary
          onClick={() => setVisible(true)}
          isLoading={disabled}
          title='Install'
        >
          <p css={disabled ? tw`mr-4 ml-4 invisible` : tw`mr-4 ml-4`}>
            <FontAwesomeIcon icon={faDownload} /> Install
          </p>
        </Button>
      </div>
    </GreyRowBox>
  );
};


