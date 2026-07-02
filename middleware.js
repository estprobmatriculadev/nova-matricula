import { NextResponse } from 'next/server';

export function middleware(request) {
  const session = request.cookies.get('tutor_session');
  const { pathname } = request.nextUrl;

  // Protected routes
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/candidates') || 
    pathname.startsWith('/classes');

  // If trying to access a protected route without a session, redirect to login page
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If already logged in and trying to access the login page, redirect to dashboard
  if (pathname === '/' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: ['/', '/dashboard/:path*', '/candidates/:path*', '/classes/:path*'],
};
