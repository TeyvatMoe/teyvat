import { type } from 'arktype';

export const schema_teyvat_server = type.enumerated('os_usa', 'os_euro', 'os_asia', 'os_cht');

export type TeyvatServer = typeof schema_teyvat_server.infer;
