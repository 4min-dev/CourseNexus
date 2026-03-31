import React from 'react'
import { Card, CardContent } from './card'
import { formatPrice } from '@/lib/formatPrice'
import { Category, Subcategory } from '@shared/schema';
import TagsMarquee from './tags-marquee';

const AdminUserCourseCard: React.FC<{
    course: any;
    isSelected: boolean;
    onToggle: () => void;
    subcategories?: Subcategory[];
    categories?: Category[];
}> = ({ course, isSelected, onToggle, subcategories, categories }) => {
    const subcategoryIds = course.subcategoryIds || [];

    const platforms = React.useMemo(() => {
        if (!subcategoryIds.length || !subcategories || !categories) return [];

        const matchedSubs = subcategories.filter(sub =>
            subcategoryIds.includes(sub.id) && sub.isActive
        );

        const categoryIds = Array.from(new Set(matchedSubs.map(sub => sub.categoryId)));

        return categories.filter(cat =>
            categoryIds.includes(cat.id) && cat.isActive
        );
    }, [subcategoryIds, subcategories, categories]);

    // Подкатегории (уровни) — те, что привязаны напрямую
    const selectedSubcategories = React.useMemo(() => {
        if (!subcategories) return [];
        return subcategories.filter(sub =>
            subcategoryIds.includes(sub.id) && sub.isActive
        );
    }, [subcategoryIds, subcategories]);

    // Если нет подкатегорий — показываем родительские из course.level
    const fallbackCategories = React.useMemo(() => {
        if (selectedSubcategories.length > 0 || !categories) return [];
        return categories.filter(cat =>
            course.level?.includes(cat.id) && cat.isActive
        );
    }, [selectedSubcategories.length, categories, course.level]);

    const allLevelBadges = selectedSubcategories.length > 0
        ? selectedSubcategories
        : fallbackCategories;

    const innerRef = React.useRef<HTMLDivElement>(null)

    const allItems = React.useMemo(() => {

        const items: Array<{ id?: string; name: string }> = [];

        platforms.forEach(p => items.push({ id: p.id, name: p.name }))
        allLevelBadges.forEach(l => items.push({ id: l.id, name: l.name }))
        if (course.year) {
            items.push({ name: String(course.year) })
        }

        return items;
    }, [platforms, allLevelBadges, course.year]);

    return (
        <Card
            key={course.id}
            className={`cursor-pointer transition-all ${isSelected
                ? "ring-2 ring-primary bg-accent"
                : "hover-elevate"
                }`}
            onClick={onToggle}
            data-testid={`card-course-grant-${course.id}`}

        >
            <CardContent className="p-3 overflow-hidden">
                <div className="flex flex-col items-start gap-3">
                    <div className="flex items-start justify-between min-w-full">
                        <h4 className="font-semibold text-sm leading-tight mb-1">
                            {course.title}
                        </h4>

                        <div className="flex-shrink-0 text-right">
                            <p className="font-semibold text-primary">
                                {formatPrice(parseFloat(course.price))} ₽
                            </p>
                        </div>
                    </div>

                    <TagsMarquee
                        items={allItems}
                        repeatCount={3}
                        className='w-full'
                        itemClassName="mx-1.5 bg-background/80"
                    />
                </div>
            </CardContent>
        </Card>
    )
}

export default AdminUserCourseCard
