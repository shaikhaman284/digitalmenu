import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Verify session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mq_session')?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;

    if (!file || !path) return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = getAdminStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!);
    const fileRef = bucket.file(path);

    // Generate a Firebase download token — this allows public access via
    // the Firebase Storage download URL without requiring object-level ACLs
    // (which are disabled on newer Firebase Storage buckets with uniform
    // bucket-level access, causing makePublic() to fail).
    const downloadToken = randomUUID();

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          // Firebase uses this token for ?alt=media&token= download URLs
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    // Construct the standard Firebase Storage download URL.
    // Works on all bucket types — no ACL change required.
    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(path);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}
