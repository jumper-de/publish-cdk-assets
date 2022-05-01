import path from "path";

import {
  Manifest,
  AssemblyManifest,
  AssetManifest,
  AssetManifestProperties,
  NestedCloudAssemblyProperties,
  FileSource,
  FileDestination,
  ArtifactType,
} from "aws-cdk-lib/cloud-assembly-schema";

interface Source extends FileSource {
  path?: string;
}

interface Asset {
  source: Source;
  destinations: { [id: string]: FileDestination };
}

export const getNestedAssets = (manifestPath: string) => {
  const assets = new Map<string, Asset>();

  const { artifacts } = Manifest.loadAssemblyManifest(
    path.join(manifestPath, "manifest.json")
  );

  for (var artifactKey in artifacts) {
    const artifact = artifacts[artifactKey];

    if (artifact.type === ArtifactType.ASSET_MANIFEST) {
      const properties = artifact.properties as AssetManifestProperties;

      const { files } = Manifest.loadAssetManifest(
        path.join(manifestPath, properties.file)
      );

      for (var fileKey in files) {
        const file = files[fileKey];

        assets.set(fileKey, {
          ...file,
          source: {
            ...file.source,
            path: file.source.path
              ? path.join(manifestPath, file.source.path)
              : undefined,
          },
        });
      }
    } else if (artifact.type === ArtifactType.NESTED_CLOUD_ASSEMBLY) {
      const properties = artifact.properties as NestedCloudAssemblyProperties;

      getNestedAssets(
        path.join(manifestPath, properties.directoryName)
      ).forEach((asset, assetKey) =>
        assets.set(assetKey, {
          ...assets.get(assetKey),
          ...asset,
          destinations: {
            ...(assets.get(assetKey) ? assets.get(assetKey)!.destinations : {}),
            ...asset.destinations,
          },
        })
      );
    }
  }

  return assets;
};
