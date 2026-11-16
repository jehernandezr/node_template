import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import 'backoffice_section_nav.dart';

/// Frame of every backoffice page: its [AppPage] (the only top bar), the
/// section navigation, an optional subtitle and the content as slivers, so a
/// long list builds only the rows on screen.
class BackofficePage extends StatelessWidget {
  const BackofficePage({
    super.key,
    required this.title,
    required this.slivers,
    this.subtitle,
  });

  final String title;
  final String? subtitle;

  /// Content below the navigation. Use [SliverList] for long lists and
  /// [SliverToBoxAdapter] for a single block.
  final List<Widget> slivers;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = subtitle;
    return AppPage(
      title: title,
      body: SafeArea(
        child: ContentColumn(
          maxWidth: AppLayout.wideContentWidth,
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(AppSpacing.md),
                sliver: SliverMainAxisGroup(
                  slivers: [
                    const SliverToBoxAdapter(child: BackofficeSectionNav()),
                    const SliverToBoxAdapter(
                      child: SizedBox(height: AppSpacing.md),
                    ),
                    if (text != null) ...[
                      SliverToBoxAdapter(
                        child: Text(
                          text,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                      const SliverToBoxAdapter(
                        child: SizedBox(height: AppSpacing.md),
                      ),
                    ],
                    ...slivers,
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
