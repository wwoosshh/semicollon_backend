// "존재 확인 → update/delete" 사이에 레코드가 동시 삭제되면 Prisma가 P2025를 던진다.
// instanceof 대신 code 프로퍼티로 판별해 Prisma 런타임 모듈 경로 변경에 영향받지 않게 한다.
export function isRecordNotFoundError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { code?: unknown }).code === 'P2025'
  );
}
