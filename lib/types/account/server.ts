import { type } from 'arktype';

export const schemaTeyvatServer = type.enumerated('os_usa', 'os_euro', 'os_asia', 'os_cht');

/**
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatServer = typeof schemaTeyvatServer.infer;
