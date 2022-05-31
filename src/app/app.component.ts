import { Component, Injectable } from "@angular/core";
import { FlatTreeControl } from "@angular/cdk/tree";
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from "@angular/material/tree";
import { BehaviorSubject } from "rxjs";

/* interfaces */
interface FoodNode {
  name: string;
  children?: FoodNode[];
  shouldHide?: boolean;
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
    children: [{ name: "Bananas" }, { name: "Figs" }],
  },
  {
    name: "Vegetables",
    children: [
      { name: "Pumpkins", children: [{ name: "White" }, { name: "Blue" }] },
      { name: "Carrots" },
    ],
  },
];

/* data service */
@Injectable({
  providedIn: "root",
})
export class Database {
  public dataChange = new BehaviorSubject<FoodNode[]>([]);

  public get dataValue(): FoodNode[] {
    return this.dataChange.value;
  }

  constructor() {
    /* load initial data */
    const data: FoodNode[] = this.buildTree(TREE_DATA);
    this.dataChange.next(data);
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

  public insertNode(parent: FoodNode, name: string): void {
    if (parent.children) {
      parent.children.push({ name: name } as FoodNode);
    } else {
      parent.children = [{ name: name } as FoodNode];
    }
    this.dataChange.next(this.dataValue);
  }

  public deleteNode(node: FoodNode): void {
    this.delete(node, this.dataValue);
    this.dataChange.next(this.dataValue);
  }

  private delete(value: FoodNode, array: FoodNode[]): void {
    for (let i = array.length - 1; i >= 0; i--) {
      if (array[i].name.toUpperCase() === value.name.toUpperCase()) {
        array.splice(i, 1);
      } else {
        if (array[i].children) {
          this.delete(value, array[i].children);
        }
      }
    }
  }

  public updateNode(node: FoodNode, name: string): void {
    node.name = name;
    this.dataChange.next(this.dataValue);
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

    database.dataChange.subscribe((data: FoodNode[]) => {
      this.dataSource.data = data;
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
      existingNode && existingNode.name === node.name
        ? existingNode
        : {
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
    this.treeControl.expand(node);
  }

  public removeNode(node: ExampleFlatNode): void {
    const nestedNode = this.flatToNestedNodeMap.get(node);
    this.database.deleteNode(nestedNode!);
    this.treeControl.expand(node);
  }

  // clone backupTreeData for filter search use only so  main datasource remains untouched
  public applyFilter(value: string): void {
    value = value.toUpperCase().trim();
    this.search(value, this.dataSource.data);
    this.database.dataChange.next(this.database.dataValue);
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
    return array.length == array.filter((i) => i.shouldHide).length;
  }
}
