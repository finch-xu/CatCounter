/** 返回未设置（undefined 或空字符串）的必需 secret 名称列表 */
export function missingSecrets(env: { ADMIN_PASSWORD?: string; SESSION_SECRET?: string }): string[] {
  const names: string[] = [];
  if (!env.ADMIN_PASSWORD) names.push('ADMIN_PASSWORD');
  if (!env.SESSION_SECRET) names.push('SESSION_SECRET');
  return names;
}
