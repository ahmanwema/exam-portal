import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const dim = size === '512x512' ? 512 : 192

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}">
    <rect width="${dim}" height="${dim}" rx="${dim * 0.125}" fill="#1d4ed8"/>
    <text x="${dim / 2}" y="${dim * 0.65}" font-size="${dim * 0.45}" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="bold">E</text>
  </svg>`

  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  })
}
