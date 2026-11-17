import {
  AccessKind,
  type AccessRequirement,
  type RouteDefinition,
} from '@contracts/platform';
import { IdentityRoute, TenantRole } from '@contracts/identity';

/**
 * Matriz de acceso de las rutas de identity, generada desde el contrato: quién llega a cada ruta, con qué
 * permisos, con qué edad máxima de MFA y qué roles de sistema la alcanzan. La comparten la prueba que
 * mantiene al día el documento y el e2e que recorre la matriz contra la app.
 */
export class AccessMatrix {
  /**
   * Rutas públicas aprobadas: entrar, registrarse, recuperar el acceso, el JWKS y las peticiones firmadas
   * por un dispositivo. Una ruta pública nueva tiene que sumarse aquí a propósito.
   */
  static readonly APPROVED_PUBLIC_ROUTES: readonly string[] = [
    IdentityRoute.SignIn,
    IdentityRoute.RequestMfaChallenge,
    IdentityRoute.VerifyMfa,
    IdentityRoute.RefreshSession,
    IdentityRoute.SignOut,
    IdentityRoute.SignUp,
    IdentityRoute.ResendEmailVerification,
    IdentityRoute.ConfirmEmailVerification,
    IdentityRoute.RequestPasswordReset,
    IdentityRoute.ConfirmPasswordReset,
    IdentityRoute.GetJwks,
    IdentityRoute.PullDeviceApprovals,
    IdentityRoute.DenyDeviceApproval,
    IdentityRoute.StartMfaRecovery,
    IdentityRoute.ConfirmMfaRecovery,
    IdentityRoute.PasskeySignInOptions,
    IdentityRoute.PasskeySignInVerify,
    IdentityRoute.PasskeyMfaOptions,
    IdentityRoute.PasskeyMfaVerify,
  ];

  /** Prettier nunca deja una columna más angosta que el separador `---`. */
  private static readonly MIN_COLUMN_WIDTH = 3;

  private static readonly ROLES: readonly TenantRole[] = [
    TenantRole.Owner,
    TenantRole.Admin,
    TenantRole.Member,
    TenantRole.Billing,
  ];

  constructor(
    private readonly routes: readonly RouteDefinition[],
    private readonly rolePermissions: Readonly<
      Record<TenantRole, readonly string[]>
    >,
  ) {}

  /** Ids de las rutas públicas que no están en la lista aprobada. */
  unapprovedPublicRoutes(): readonly string[] {
    return this.routes
      .filter((route) => route.access.kind === AccessKind.Public)
      .map((route) => route.id)
      .filter((id) => !AccessMatrix.APPROVED_PUBLIC_ROUTES.includes(id));
  }

  /** El documento completo en Markdown, con una fila por ruta ordenada por path y método. */
  render(): string {
    const header = [
      'Ruta',
      'Id',
      'Acceso',
      'Permisos',
      'MFA reciente',
      ...AccessMatrix.ROLES.map((role) => `\`${role}\``),
    ];
    const rows = [...this.routes]
      .sort(
        (a, b) =>
          a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
      )
      .map((route) => this.row(route));
    const table = [header, header.map(() => ''), ...rows];
    const widths = header.map((_, column) =>
      Math.max(
        AccessMatrix.MIN_COLUMN_WIDTH,
        ...table.map((cells) => (cells[column] ?? '').length),
      ),
    );
    return [
      '# Matriz de acceso de identity',
      '',
      'Generada desde `@contracts/identity` por `src/__tests__/access-matrix.spec.ts`; no se edita a mano. Para regenerarla: `UPDATE_ACCESS_MATRIX=true pnpm nx test identity --testPathPatterns=access-matrix.spec`.',
      '',
      '- **Acceso**: `pública` no pide token; `sesión` pide un access token vigente del tenant activo.',
      '- **MFA reciente**: minutos máximos desde el último segundo factor (step-up); sin valor, no se exige.',
      '- **Roles**: `sí` cuando el rol de sistema tiene todos los permisos de la ruta. Un rol propio del tenant alcanza la ruta si suma esos permisos.',
      '- Las rutas públicas están todas aprobadas en `AccessMatrix.APPROVED_PUBLIC_ROUTES`; el e2e `access-matrix.e2e-spec.ts` recorre cada ruta con sesión sin token, sin permiso y sin MFA reciente.',
      '',
      this.line(header, widths),
      this.line(
        widths.map((width) => '-'.repeat(width)),
        widths,
      ),
      ...rows.map((row) => this.line(row, widths)),
      '',
    ].join('\n');
  }

  private row(route: RouteDefinition): string[] {
    const access = route.access;
    const authenticated = access.kind === AccessKind.Authenticated;
    return [
      `\`${route.method} ${route.path}\``,
      `\`${route.id}\``,
      authenticated ? 'sesión' : 'pública',
      (access.permissions ?? []).map((p) => `\`${p}\``).join(', '),
      access.mfaMaxAgeMinutes === undefined
        ? ''
        : `${access.mfaMaxAgeMinutes} min`,
      ...AccessMatrix.ROLES.map((role) =>
        authenticated && this.grants(role, access) ? 'sí' : '',
      ),
    ];
  }

  private grants(role: TenantRole, access: AccessRequirement): boolean {
    return (access.permissions ?? []).every((permission) =>
      this.rolePermissions[role].includes(permission),
    );
  }

  /** Celdas alineadas como las deja Prettier, así el documento pasa `format:check` tal como se genera. */
  private line(cells: readonly string[], widths: readonly number[]): string {
    const padded = cells.map((cell, column) =>
      cell.padEnd(widths[column] ?? 0),
    );
    return `| ${padded.join(' | ')} |`;
  }
}
