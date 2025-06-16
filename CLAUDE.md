# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application with TypeScript, Tailwind CSS v4, and DaisyUI components. The project uses the modern App Router architecture with React 19.

## Development Commands

- `npm run dev` - Start development server with Turbopack for fast development
- `npm run build` - Build production version 
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with Next.js TypeScript configuration

## Architecture

- **Framework**: Next.js 15 with App Router
- **Styling**: DaisyUI component library with Tailwind CSS v4 - prioritize DaisyUI components over custom Tailwind classes
- **TypeScript**: Strict mode enabled with path mapping (`@/*` → `./src/*`)
- **Fonts**: Geist Sans and Geist Mono from Google Fonts
- **File Structure**: Standard Next.js App Router layout in `src/app/`

## Key Configuration

- **ESLint**: Uses Next.js core-web-vitals and TypeScript configurations
- **PostCSS**: Configured for Tailwind CSS v4 with DaisyUI plugin
- **TypeScript**: ES2017 target with strict mode and incremental compilation
- **Next.js**: Uses Turbopack in development for faster builds

## Development Notes

- Main entry point is `src/app/page.tsx`
- Global styles in `src/app/globals.css` import Tailwind and DaisyUI
- Font variables are set up in `src/app/layout.tsx` for consistent typography
- Development server runs on http://localhost:3000

## Styling Guidelines

- **Prefer DaisyUI components**: Use DaisyUI classes and components whenever possible before falling back to custom Tailwind CSS
- **DaisyUI Documentation**: Reference https://daisyui.com/components/ for available components
- **Common DaisyUI Classes**: btn, card, navbar, drawer, modal, badge, alert, input, textarea, select, etc.
- **Theme Support**: DaisyUI provides built-in theme support - consider using theme-aware components