import { Component, Injectable } from "@angular/core";
import { FlatTreeControl } from "@angular/cdk/tree";
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from "@angular/material/tree";
import { BehaviorSubject, map } from "rxjs";
import { HttpClient } from "@angular/common/http";

/* interfaces */
interface FoodNode {
  name: string;
  children?: FoodNode[];
  shouldHide?: boolean;
  id: number;
}

interface ExampleFlatNode {
  expandable: boolean;
  name: string;
  level: number;
  shouldHide?: boolean;
}

/* data to consume */
const TREE_DATA: FoodNode[] = [
  {
    name: "Fruits",
    children: [
      { name: "Bananas", id: 2 },
      { name: "Figs", id: 3 },
    ],
    id: 1,
  },
  {
    name: "Vegetables",
    children: [
      {
        name: "Pumpkins",
        children: [
          { name: "White", id: 7 },
          { name: "Blue", id: 8 },
        ],
        id: 5,
      },
      { name: "Carrots", id: 6 },
    ],
    id: 4,
  },
];

/* data service */
@Injectable({
  providedIn: "root",
})
export class Database {
  public id: string;
  public treeChange$: BehaviorSubject<FoodNode[]>;
  public isReload: boolean;

  private endpoint = "https://mat-tree-default-rtdb.firebaseio.com/node";

  public get treeDataValue(): FoodNode[] {
    return this.treeChange$.value;
  }

  constructor(private http: HttpClient) {
    /* load initial data */
    const initialData: FoodNode[] = this.buildTree(TREE_DATA);
    this.treeChange$ = new BehaviorSubject<FoodNode[]>(initialData);

    if (!localStorage.getItem("tree-id")) {
      this.http
        .post<FoodNode[]>(`${this.endpoint}.json`, this.treeDataValue)
        .subscribe((data: FoodNode[]) => {
          if (data) {
            this.initialLoad();
          }
        });
    } else {
      this.isReload = true;
      this.id = localStorage.getItem("tree-id");
      this.getItems();
    }
  }

  /* initial tree build */
  private buildTree(nodes: FoodNode[]): FoodNode[] {
    let nodesArray = [];
    for (let node of nodes) {
      let newNode = { ...node };
      nodesArray.push(newNode);
      if (node.children) {
        this.buildTree(node.children);
      }
    }
    return nodesArray;
  }

 /* on first load only */
  public initialLoad(): void {
    this.http
      .get<{[key: string]: FoodNode[]}>(`${this.endpoint}.json`)
      .pipe(
        map((res) => {
          for (const key in res) {
            if (res.hasOwnProperty(key)) {
              this.id = key;
              localStorage.setItem("tree-id", this.id);
              return res[key];
            }
          }
        })
      )
      .subscribe((data: FoodNode[]) => {
        this.treeChange$.next(data);
      });
  }

  public getItems(): void {
    this.http
      .get<{[key: string]: FoodNode[]}>(`${this.endpoint}.json`)
      .pipe(
        map((res) => {
          for (const key in res) {
            if (res.hasOwnProperty(key)) {
              return res[key];
            }
          }
        })
      )
      .subscribe((data: FoodNode[]) => {
        if (this.isReload) {
          this.showAll(data);
          this.isReload = false;
        }
        this.treeChange$.next(data);
      });
  }

  public insertNode(parent: FoodNode, name: string): void {
    const id = Math.random();
    if (parent.children) {
      parent.children.push({ name, id } as FoodNode);
    } else {
      parent.children = [{ name, id } as FoodNode];
    }
    this.treeChange$.next(this.treeDataValue);
  }

  private update(): void {
    this.http
      .put<FoodNode[]>(`${this.endpoint}/${this.id}.json`, this.treeDataValue)
      .subscribe((data: FoodNode[]) => {
        if (data) {
          this.treeChange$.next(data);
        }
      });
  }

  public updateNode(node?: FoodNode, name?: string): void {
    if (name) {
      node.name = name;
    }
    this.update();
  }

  private delete(value: FoodNode, array: FoodNode[]): void {
    for (let i = array.length - 1; i >= 0; i--) {
      if (
        array[i].name.toUpperCase() === value.name.toUpperCase() &&
        array[i].id === value.id
      ) {
        array.splice(i, 1);
      } else {
        if (array[i].children) {
          this.delete(value, array[i].children);
        }
      }
    }
  }

  public deleteNode(node: FoodNode): void {
    this.delete(node, this.treeDataValue);
    this.update();
  }

 /* if filters applied and page reloads, remove filters */
  private showAll(array: FoodNode[]): void {
    for (let i = array.length - 1; i >= 0; i--) {
      if (array[i].children) {
        this.showAll(array[i].children);
      }
      array[i].shouldHide = false;
    }
  }
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  private flatToNestedNodeMap = new Map<ExampleFlatNode, FoodNode>();
  private nestedToFlatNodeMap = new Map<FoodNode, ExampleFlatNode>();
  public treeControl: FlatTreeControl<ExampleFlatNode>;
  private treeFlattener: MatTreeFlattener<FoodNode, ExampleFlatNode>;
  public dataSource: MatTreeFlatDataSource<FoodNode, ExampleFlatNode>;

  constructor(private database: Database) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<ExampleFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );

    database.treeChange$.subscribe((data: FoodNode[]) => {
      this.dataSource.data = data;
      this.treeControl.expandAll();
    });
  }
  private getLevel = (node: ExampleFlatNode) => node.level;

  private isExpandable = (node: ExampleFlatNode) => node.expandable;

  private getChildren = (node: FoodNode): FoodNode[] => node.children;

  public hasChild = (_: number, _nodeData: ExampleFlatNode) =>
    _nodeData.expandable;

  public hasNoContent = (_: number, _nodeData: ExampleFlatNode) =>
    _nodeData.name === "";

  private transformer = (node: FoodNode, level: number) => {
    const existingNode = this.nestedToFlatNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.name === node.name ? existingNode : {
          expandable: false,
          name: "",
          level: 0,
          shouldHide: false,
        };

    flatNode.name = node.name;
    flatNode.level = level;
    flatNode.expandable = node.children && !!node.children.length;
    flatNode.shouldHide = node.shouldHide ?? false;

    this.flatToNestedNodeMap.set(flatNode, node);
    this.nestedToFlatNodeMap.set(node, flatNode);
    return flatNode;
  };

  public addNewNode(node: ExampleFlatNode): void {
    const parentNode = this.flatToNestedNodeMap.get(node);
    this.database.insertNode(parentNode!, "");
    this.treeControl.expand(node);
  }

  public saveNode(node: ExampleFlatNode, itemValue: string): void {
    const nestedNode = this.flatToNestedNodeMap.get(node);
    this.database.updateNode(nestedNode!, itemValue);
  }

  public removeNode(node: ExampleFlatNode): void {
    const nestedNode = this.flatToNestedNodeMap.get(node);
    this.database.deleteNode(nestedNode!);
  }

  public applyFilter(value: string): void {
    value = value.toUpperCase().trim();
    this.search(value, this.dataSource.data);
    this.database.treeChange$.next(this.database.treeDataValue);
    this.treeControl.expandAll();
  }

  private search(value: string, array: FoodNode[]): boolean {
    for (let i = array.length - 1; i >= 0; i--) {
      if (array[i].name.toUpperCase().indexOf(value) > -1) {
        if (array[i].children) {
          this.search(value, array[i].children);
        }
        array[i].shouldHide = false;
      } else {
        if (array[i].children) {
          let parentCanBeEliminated = this.search(value, array[i].children);
          if (parentCanBeEliminated === true) {
            array[i].shouldHide = true;
          } else {
            array[i].shouldHide = false;
          }
        } else {
          array[i].shouldHide = true;
        }
      }
    }
    return array.length === array.filter((i: FoodNode) => i.shouldHide).length;
  }
}
