import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js Navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "",
}));

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock Framer Motion to skip animations in tests
vi.mock("framer-motion", () => {
  const motionComp =
    (Tag: string) =>
    ({
      children,
      initial,
      animate,
      exit,
      transition,
      viewport,
      whileInView,
      ...props
    }: any) =>
      <Tag {...props}>{children}</Tag>;

  return {
    motion: {
      div: motionComp("div"),
      h1: motionComp("h1"),
      h2: motionComp("h2"),
      p: motionComp("p"),
      span: motionComp("span"),
      section: motionComp("section"),
      a: motionComp("a"),
      button: motionComp("button"),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});
