/** Minimal typings for the published face-age package (dist/FaceAge.d.ts is not shipped). */

type FaceAgeProblem = {
  key?: string;
  title?: string;
  number?: number | string;
  format?: string;
  description?: string;
};

type FaceAgeAdvisorData = {
  analysis?: FaceAgeProblem[] | { problems?: FaceAgeProblem[] };
  activeSelections?: Record<string, unknown> | null;
};

type FaceAgeOptions = {
  elementId?: string;
  faceageId: string;
  displayModel?: "widget" | "section" | "modal";
  language?: string;
  height?: string;
  width?: string;
  quiz?: boolean;
  history?: boolean;
  showProducts?: boolean;
  showRoutine?: boolean;
  showCamera?: boolean;
  showUpload?: boolean;
  problems?: string[];
  gtag?: string | null;
  gtagInsert?: boolean;
  fbPixel?: string | null;
  fbPixelInsert?: boolean;
};

type FaceAgeApi = {
  getAdvisorData(callback: (data: FaceAgeAdvisorData) => void): Promise<unknown>;
  getActiveSelections(callback: (data: Record<string, unknown>) => void): Promise<unknown>;
  getImage(): string | null;
  setCustomProducts(products: unknown[]): unknown;
  setHistoryData(data: unknown): Promise<unknown>;
  removeHistoryItem(id: string | null): Promise<unknown>;
  getRoutineGroup(): unknown;
  getReportPdf(): Promise<unknown>;
  submitSdkIntegration(email: string, extra?: Record<string, unknown>): Promise<unknown>;
};

type FaceAgeInstance = {
  render(): Promise<unknown>;
  API: FaceAgeApi;
  onAddToCart(callback: (data: unknown) => void): Promise<unknown>;
  onCheckout(callback: (data: unknown) => void): Promise<unknown>;
  onClickProduct(callback: (product: unknown) => void): Promise<unknown>;
  onDisplayProducts(callback: (data: unknown) => void): Promise<unknown>;
  onDisplayRoutines(callback: (data: unknown) => void): Promise<unknown>;
  onResetData(callback: () => void): Promise<unknown>;
  onCloseModal(callback: () => void): Promise<unknown>;
  onClickProblem(callback: (key: string) => void): Promise<unknown>;
};

interface Window {
  FaceAge?: new (options: FaceAgeOptions) => FaceAgeInstance;
}
