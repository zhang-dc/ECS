// export interface TypeTreeProps<T> {
//     root: ItemType<T>;
// }

// export class Tree<T> {
//     children: Tree<T>[] = [];
//     node: T;
//     constructor(node: T) {
//         this.node = node;
//     }

//     addChild(child: Tree<T>) {
//         if (this.children.includes(child)) {
//             return;
//         }
//         this.children.push(child);
//     }
// }

// export type ItemType<T> = new (props: any) => T;

// export class TypeTree<T> {
//     root: ItemType<T>;
//     tree: Tree<ItemType<T>>;
//     subTreeCache: Map<ItemType<T>, ItemType<T>[]> = new Map();
//     typeList: Set<ItemType<T>> = new Set();

//     constructor(props: TypeTreeProps<T>) {
//         const { root } = props;
//         this.root = root;
//         this.tree = new Tree(root);
//     }

//     addType(type: ItemType<T>) {
//         if (this.typeList.has(type)) {
//             return;
//         }
//         const subTree = new Tree(type);
//         this.tree.addChild(subTree);
//         const types = this.subTreeCache.keys();
//         types.forEach((type) => {

//         });
//     }
// }
