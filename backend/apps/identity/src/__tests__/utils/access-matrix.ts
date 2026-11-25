import {
  AccessKind,
  type AccessRequirement,
  type RouteDefinition,
} from '@contracts/platform';
import { IdentityRoute, TenantRole } from '@contracts/identity';

/**
 * Access matrix of the identity routes, generated from the contract: who reaches each route, with which
 * permissions, with what maximum MFA age and which system roles reach it. Shared by the test that keeps
 * the document current and the e2e that walks the matrix against the app.
 */
export class AccessMatrix {
  /**
   * Approved public routes: sign in, sign up, account recovery, the JWKS and requests signed by a
   * device. A new public route has to be added here on purpose.
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

  /** Prettier never leaves a column narrower than the `---` separator. */
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

  /** Ids of the public routes missing from the approved list. */
  unapprovedPublicRoutes(): readonly string[] {
    return this.routes
      .filter((route) => route.access.kind === AccessKind.Public)
      .map((route) => route.id)
      .filter((id) => !AccessMatrix.APPROVED_PUBLIC_ROUTES.includes(id));
  }

  /** The full Markdown document, one row per route sorted by path and method. */
  render(): string {
    const header = [
      'Route',
      'Id',
      'Access',
      'Permissions',
      'Recent MFA',
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
      '# Identity access matrix',
      '',
      'Generated from `@contracts/identity` by `src/__tests__/access-matrix.spec.ts`; do not edit by hand. To regenerate it: `UPDATE_ACCESS_MATRIX=true pnpm nx test identity --testPathPatterns=access-matrix.spec`.',
      '',
      '- **Access**: `public` requires no token; `session` requires a valid access token for the active tenant.',
      '- **Recent MFA**: maximum minutes since the last second factor (step-up); with no value, it is not required.',
      "- **Roles**: `yes` when the system role has all the route's permissions. A tenant's own role reaches the route if it adds up to those permissions.",
      '- All public routes are approved in `AccessMatrix.APPROVED_PUBLIC_ROUTES`; the e2e `access-matrix.e2e-spec.ts` walks every session route with no token, no permission and no recent MFA.',
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
      authenticated ? 'session' : 'public',
      (access.permissions ?? []).map((p) => `\`${p}\``).join(', '),
      access.mfaMaxAgeMinutes === undefined
        ? ''
        : `${access.mfaMaxAgeMinutes} min`,
      ...AccessMatrix.ROLES.map((role) =>
        authenticated && this.grants(role, access) ? 'yes' : '',
      ),
    ];
  }

  private grants(role: TenantRole, access: AccessRequirement): boolean {
    return (access.permissions ?? []).every((permission) =>
      this.rolePermissions[role].includes(permission),
    );
  }

  /** Cells aligned as Prettier leaves them, so the document passes `format:check` as generated. */
  private line(cells: readonly string[], widths: readonly number[]): string {
    const padded = cells.map((cell, column) =>
      cell.padEnd(widths[column] ?? 0),
    );
    return `| ${padded.join(' | ')} |`;
  }
}
