import {
    Input,
    Directive,
    OnInit,
    OnChanges,
    OnDestroy,
    AfterViewInit,
    ElementRef,
    SimpleChanges,
} from '@angular/core';
// @ts-ignore
import { Subscription, Observable, BehaviorSubject } from "rxjs";
import { DropTarget, SkyhookDndService } from "angular-skyhook";
import { SortableSpec, DraggedItem, ItemTypes } from "./types";
import { CardRendererContext } from "./card-renderer.directive";
import { isEmpty } from './isEmpty';

@Directive({
    selector: '[cardList]',
    exportAs: 'cardList'
})
export class CardListDirective<Data> implements OnInit, OnChanges, OnDestroy, AfterViewInit {
    listId: any = Math.random().toString();
    @Input('cardListId') set cardListId(listId: any) {
        const old = this.listId;
        if (old !== listId) {
            this.listId = listId;
            this.updateSubscription();
        }
    }
    @Input('cardListHorizontal') horizontal = false;
    @Input('cardListType') type: string | symbol = ItemTypes.CARD;
    protected spec!: SortableSpec<Data>;
    @Input('cardListSpec') set cardListSpec(spec: SortableSpec<Data>) {
        const old = this.spec;
        if (old !== spec) {
            this.spec = spec;
            this.updateSubscription();
        }
    }

    /** @ignore */
    private children?: Iterable<Data>;
    /** @ignore */
    private childrenSubject$ = new BehaviorSubject<Iterable<Data>>([]);
    /**
     * A handy way to subscribe to spec.getList().
     */
    public children$: Observable<Iterable<Data>> = this.childrenSubject$;

    /** @ignore */
    subs = new Subscription();
    listSubs = new Subscription();

    /** @ignore */
    target: DropTarget<DraggedItem<Data>> = this.dnd.dropTarget<DraggedItem<Data>>(null, {
        canDrop: monitor => {
            if (monitor.getItemType() !== this.type) {
                return false;
            }
            const item = monitor.getItem();
            if (!item) { return false; }
            return this.getCanDrop(item);
        },
        drop: monitor => {
            const item = monitor.getItem();
            if (item && this.getCanDrop(item)) {
                this.spec && this.spec.drop && this.spec.drop(item);
            }
            return {};
        },
        hover: monitor => {
            const item = monitor.getItem();
            if (isEmpty(this.children) && item) {
                const canDrop = this.getCanDrop(item);
                if (canDrop && monitor.isOver({ shallow: true })) {
                    this.callHover(item, {
                        listId: this.listId,
                        index: 0,
                    });
                }
            }
        }
    }, this.subs);

    constructor(
        protected dnd: SkyhookDndService,
        protected el: ElementRef<HTMLElement>,
    ) {
    }

    private updateSubscription() {
        const anyListId = (typeof this.listId !== 'undefined')
            && (this.listId !== null);
        if (anyListId && this.spec) {
            if (this.listSubs) {
                this.subs.remove(this.listSubs);
                this.listSubs.unsubscribe();
            }

            const cs$ = this.spec.getList(this.listId);
            this.listSubs = cs$ && cs$.subscribe(l => {
                if (l) {
                    this.childrenSubject$.next(l);
                    this.children = l;
                }
            });

            this.subs.add(this.listSubs);
        }
    }

    ngOnChanges({ type }: SimpleChanges) {
        if (type) {
            this.target.setTypes(type.currentValue);
        }
    }

    public contextFor(data: Data, index: number): CardRendererContext<Data> {
        return {
            data,
            index,
            listId: this.listId,
            type: this.type,
            spec: this.spec,
            horizontal: this.horizontal
        };
    }

    /** @ignore */
    private getCanDrop(item: DraggedItem<Data>, _default = true) {
        if (this.spec && this.spec.canDrop) {
            return this.spec.canDrop(item);
        }
        return _default;
    }

    /** @ignore */
    private callHover(item: DraggedItem<Data>, newHover?: { listId: any; index: number; }) {
        if (newHover) {
            // mutate the object
            item.hover = newHover;
            // but also shallow clone so distinct from previous,
            // useful if you rely on that for ngrx
            item = { ...item };
        }
        this.spec && this.spec.hover && this.spec.hover(item);
    }

    ngOnInit() {}

    /** @ignore */
    ngAfterViewInit() {
        if (this.el) {
            this.target.connectDropTarget(this.el.nativeElement);
        } else {
            throw new Error('cardList directive must have ElementRef');
        }
    }

    /** @ignore */
    ngOnDestroy() {
        this.subs.unsubscribe();
    }

}
