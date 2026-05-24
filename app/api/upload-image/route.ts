import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

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

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });

    // Make file publicly accessible at GCS level (bypasses Firebase Storage rules)
    await fileRef.makePublic();

    // Use direct GCS URL — works regardless of Firebase Storage security rules
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}
