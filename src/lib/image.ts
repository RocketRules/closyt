import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function compressForVision(uri: string): Promise<{ uri: string; base64: string }> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
    compress: 0.72,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) {
    throw new Error('Could not read image data');
  }
  return { uri: result.uri, base64: result.base64 };
}
