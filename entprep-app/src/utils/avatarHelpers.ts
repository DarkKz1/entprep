import { supabase } from '../config/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const AVATAR_SIZE = 200;

function resizeImage(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      // crop to square from center
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      // try WebP first, fall back to JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) return resolve(blob);
          canvas.toBlob(
            (jpgBlob) => (jpgBlob ? resolve(jpgBlob) : reject(new Error('Failed to compress image'))),
            'image/jpeg',
            0.85
          );
        },
        'image/webp',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  if (file.size > MAX_FILE_SIZE) throw new Error('Файл слишком большой (макс. 5 МБ)');

  const blob = await resizeImage(file, AVATAR_SIZE);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: blob.type, upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });
  if (updateError) throw updateError;

  // Also update profiles table so leaderboard/friends see the new avatar
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);

  return publicUrl;
}
