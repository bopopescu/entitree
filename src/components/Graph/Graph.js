import "./Graph.scss";
import { TransformWrapper } from "react-zoom-pan-pinch";
import { AppContext } from "../../App";
import React, {
  useReducer,
  useContext,
  useRef,
  useEffect,
  useState,
} from "react";
import { TransformComponent } from "react-zoom-pan-pinch";
import getItems from "../../wikidata/getItems";
import { hierarchy } from "d3-hierarchy";
import {
  CARD_WIDTH,
  SIBLING_SPOUSE_SEPARATION,
  MAX_LEVEL_ITEMS,
} from "../../constants/tree";
import Node from "../Node/Node";
import Rel from "../Rel/Rel";
import { CHILD_ID } from "../../constants/properties";
import graphReducer, { initialState } from "./graphReducer";
import { Button } from "react-bootstrap";
import { FiMinus, FiPlus, FiPrinter } from "react-icons/fi";
import { IoMdExpand } from "react-icons/io";
import { RiFocus3Line } from "react-icons/ri";
import getNodeUniqueId from "../../lib/getNodeUniqueId";
import filterSpouses from "../../lib/filterSpouses";
import addEntityConnectors from "../../lib/addEntityConnectors";
import getUpMap from "../../wikidata/getUpMap";
import setPageTitle from "../../lib/setPageTitle";
import last from "../../lib/last";

function Graph({
  currentEntity,
  currentProp,
  setTransform,
  zoomIn,
  zoomOut,
  scale: currentScale,
  ...props
}) {
  const { showError, currentLang } = useContext(AppContext);

  const [graph, dispatchGraph] = useReducer(graphReducer, initialState);
  const [focusedNode, setFocusedNode] = useState();

  const graphRef = useRef();
  const [graphWidth, setGraphWidth] = useState(0);
  const [graphHeight, setGraphHeight] = useState(0);
  const upMap = useRef();

  useEffect(() => {
    const handleResize = () => {
      setGraphWidth(graphRef.current.offsetWidth);
      setGraphHeight(graphRef.current.offsetHeight);
    };
    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [graphRef]);

  //GET ROOT
  useEffect(() => {
    if (currentEntity) {
      (async () => {
        try {
          //property has been selected from dropdown
          if (currentProp) {
            upMap.current = await getUpMap(currentEntity.id, currentProp.id);
            const rootItem = addEntityConnectors(
              currentEntity,
              currentProp.id,
              {
                upMap: upMap.current,
                addDownIds: true,
                addRightIds: currentProp.id === CHILD_ID,
                addLeftIds: currentProp.id === CHILD_ID,
              }
            );
            const root = hierarchy(rootItem);
            const rootId = getNodeUniqueId(root, 0);
            root.treeId = rootId;
            root.isRoot = true;
            root.x = 0;
            root.y = 0;

            //annoyingly a repetition but correct in order to have separate trees
            let childTree = hierarchy(rootItem);
            childTree.treeId = rootId;
            childTree.isRoot = true;
            childTree.x = 0;
            childTree.y = 0;

            let parentTree = hierarchy(rootItem);
            parentTree.treeId = rootId;
            parentTree.isRoot = true;
            parentTree.x = 0;
            parentTree.y = 0;

            dispatchGraph({
              type: "set",
              root,
              childTree,
              parentTree,
            });

            toggleParents(parentTree);
            toggleChildren(childTree);
          } else {
            //currentEntity has changed from searchBox
            const root = hierarchy(currentEntity);
            root.treeId = getNodeUniqueId(root, 0);
            dispatchGraph({
              type: "set",
              root,
            });
          }

          setTransform(0, 0, 1, 0);
          setFocusedNode(root);
          setPageTitle(currentEntity, currentProp);
        } catch (error) {
          showError(error);
        }
      })();
    }
  }, [currentEntity, currentProp]);

  const toggleChildren = async (node) => {
    if (node._childrenExpanded) {
      return dispatchGraph({ type: "collapseChildren", node });
    }
    //has cached children
    if (node._children) {
      return dispatchGraph({ type: "expandChildren", node });
    }
    try {
      if (!node.data.downIds || !node.data.downIds.length) return;

      const entities = await getItems(
        node.data.downIds,
        currentLang.code,
        currentProp.id,
        {
          addDownIds: true,
          addRightIds: currentProp.id === CHILD_ID,
        }
      );

      entities.forEach((entity, index) => {
        const childNode = hierarchy(entity);
        childNode.depth = node.depth + 1;
        childNode.parent = node;
        childNode.treeId = getNodeUniqueId(childNode, index);
        childNode.isChild = true;
        if (!node.children) {
          node.children = [];
        }
        node.children.push(childNode);
      });

      dispatchGraph({ type: "expandChildren", node });
    } catch (error) {
      showError(error);
    }
  };

  const toggleParents = async (node) => {
    if (node._parentsExpanded) {
      return dispatchGraph({ type: "collapseParents", node });
    }
    //has cached parents
    if (node._parents) {
      return dispatchGraph({ type: "expandParents", node });
    }

    try {
      if (!node.data.upIds || !node.data.upIds.length) return;
      const entities = await getItems(
        node.data.upIds,
        currentLang.code,
        currentProp.id,
        {
          upMap: upMap.current,
          addLeftIds: currentProp.id === CHILD_ID,
          addRightIds: currentProp.id === CHILD_ID,
        }
      );

      const parentDepth = node.depth - 1;
      entities.forEach((entity, index) => {
        const parentNode = hierarchy(entity);
        parentNode.isParent = true;
        parentNode.depth = parentDepth;
        parentNode.parent = node;
        parentNode.treeId = getNodeUniqueId(parentNode, index);
        if (!node.children) {
          node.children = [];
        }
        node.children.push(parentNode);
      });
      if (currentProp.id === CHILD_ID) {
        filterSpouses(node);
      }
      if (node.children.length > MAX_LEVEL_ITEMS) {
        node._allChildren = [...node.children];
        node.children = node.children.slice(0, MAX_LEVEL_ITEMS);
        last(node.children).nextIndex = MAX_LEVEL_ITEMS;
      }
      dispatchGraph({ type: "expandParents", node });
    } catch (error) {
      showError(error);
    }
  };

  const showMoreRightParents = (node) => {
    const nextIndex = node.nextIndex + MAX_LEVEL_ITEMS;
    const prevIndex = node.nextIndex;
    node.parent.children = node.parent._allChildren.slice(prevIndex, nextIndex);
    node.parent.children[0].prevIndex = prevIndex > 0 ? prevIndex : null;
    last(node.parent.children).nextIndex =
      nextIndex < node.parent._allChildren.length ? nextIndex : null;
    dispatchGraph({ type: "moreParents", node });
  };

  const showMoreLeftParents = (node) => {
    const prevIndex = node.prevIndex - MAX_LEVEL_ITEMS;
    const nextIndex = node.prevIndex;
    node.parent.children = node.parent._allChildren.slice(prevIndex, nextIndex);
    node.parent.children[0].prevIndex = prevIndex > 0 ? prevIndex : null;
    last(node.parent.children).nextIndex =
      nextIndex < node.parent._allChildren.length ? nextIndex : null;
    dispatchGraph({ type: "moreParents", node });
  };

  const toggleSpouses = async (node) => {
    if (node._spousesExpanded) {
      return dispatchGraph({ type: "collapseSpouses", node });
    }
    if (node._spouses) {
      return dispatchGraph({ type: "expandSpouses", node });
    }
    try {
      if (!node.data.rightIds || !node.data.rightIds.length) return;
      const entities = await getItems(node.data.rightIds, currentLang.code);
      entities.forEach((entity, index) => {
        const childNode = hierarchy(entity);
        childNode.depth = node.depth;
        childNode.isSpouse = true;
        childNode.virtualParent = node;
        childNode.parent = node.parent;
        childNode.treeId = getNodeUniqueId(childNode, index, "spouse");
        const childIndex = node.parent.children.indexOf(node) + 1;
        node.parent.children.splice(childIndex, 0, childNode);
      });
      dispatchGraph({ type: "expandSpouses", node });
    } catch (error) {
      showError(error);
    }
  };

  const toggleSiblings = async (node) => {
    if (node._siblingsExpanded) {
      return dispatchGraph({ type: "collapseSiblings", node });
    }

    if (node._siblings) {
      return dispatchGraph({ type: "expandSiblings", node });
    }

    try {
      if (!node.data.leftIds || !node.data.leftIds.length) return;
      const entities = await getItems(node.data.leftIds, currentLang.code);
      entities.forEach((entity, index) => {
        const childNode = hierarchy(entity);
        childNode.depth = node.depth;
        childNode.isSibling = true;
        childNode.virtualParent = node;
        childNode.parent = node.parent;
        childNode.treeId = getNodeUniqueId(childNode, index, "sibling");
        const childIndex = node.parent.children.indexOf(node);
        node.parent.children.splice(childIndex, 0, childNode);
      });
      dispatchGraph({ type: "expandSiblings", node });
    } catch (error) {
      showError(error);
    }
  };

  const toggleRootSpouses = async () => {
    const { root } = graph;
    if (root._spousesExpanded) {
      return dispatchGraph({ type: "collapseRootSpouses", root });
    }
    if (root._spouses) {
      return dispatchGraph({ type: "expandRootSpouses", root });
    }

    try {
      const entities = await getItems(root.data.rightIds, currentLang.code);
      const baseX = CARD_WIDTH * SIBLING_SPOUSE_SEPARATION;
      entities.forEach((entity, index) => {
        const spouseNode = hierarchy(entity);
        spouseNode.isSpouse = true;
        spouseNode.x = baseX + baseX * index;
        spouseNode.y = 0;
        spouseNode.depth = 0;
        spouseNode.parent = root;
        spouseNode.treeId = getNodeUniqueId(spouseNode, index, "spouse");
        if (!root.spouses) root.spouses = [];
        root.spouses.push(spouseNode);
      });
      dispatchGraph({ type: "expandRootSpouses", root });
    } catch (error) {
      showError(error);
    }
  };

  const toggleRootSiblings = async () => {
    const { root } = graph;
    if (root._siblingsExpanded) {
      return dispatchGraph({ type: "collapseRootSiblings", root });
    }
    if (root._siblings) {
      return dispatchGraph({ type: "expandRootSiblings", root });
    }

    try {
      const entities = await getItems(root.data.leftIds, currentLang.code);
      const baseX = -(CARD_WIDTH * SIBLING_SPOUSE_SEPARATION);
      entities.forEach((entity, index, { length }) => {
        const siblingNode = hierarchy(entity);
        siblingNode.isSibling = true;
        siblingNode.x = baseX * (length - index);
        siblingNode.y = 0;
        siblingNode.treeId = getNodeUniqueId(siblingNode, index, "sibling");
        if (!root.siblings) root.siblings = [];
        root.siblings.push(siblingNode);
      });
      dispatchGraph({ type: "expandRootSiblings", root });
    } catch (error) {
      showError(error);
    }
  };

  const fitTree = () => {
    const leftEdge = graph.maxLeft - CARD_WIDTH; //should be CARD_WIDTH / 2 but give some padding
    const topEdge = graph.maxTop - CARD_WIDTH / 2;
    const rightEdge = graph.maxRight + CARD_WIDTH;
    const bottomEdge = graph.maxBottom + CARD_WIDTH / 2;
    const treeWidth = rightEdge - leftEdge;
    const treeHeight = bottomEdge - topEdge;

    let nextScale;
    if (graphWidth - treeWidth < graphHeight - treeHeight) {
      nextScale = graphWidth / treeWidth;
    } else {
      nextScale = graphHeight / treeHeight;
    }
    if (nextScale > 2) nextScale = 2;

    const centerX = leftEdge + treeWidth / 2;
    const centerY = topEdge + treeHeight / 2;

    centerPoint(centerX, centerY, nextScale);
  };

  const centerPoint = (x, y, scale = currentScale) => {
    const halfWidth = graphWidth / 2;
    const calculatedPositionX = halfWidth - (halfWidth + x) * scale;
    let calculatedPositionY = y;
    if (!isNaN(y)) {
      const halfHeight = graphHeight / 2;
      calculatedPositionY = halfHeight - (halfHeight + y) * scale;
    }
    setTransform(calculatedPositionX, calculatedPositionY, scale);
  };

  const {
    root,
    childTree,
    parentTree,
    containerStyle,
    parentNodes,
    childNodes,
    parentRels,
    childRels,
  } = graph;

  return (
    <div className="Graph" ref={graphRef}>
      <TransformComponent>
        <div className="center">
          <svg className="svgContainer" style={containerStyle}>
            <g
              transform={`translate(${containerStyle.width / 2} ${
                containerStyle.height / 2
              })`}
            >
              <g className="rels">
                {childRels.map((rel) => (
                  <Rel key={rel.source.treeId + rel.target.treeId} rel={rel} />
                ))}
                {parentRels.map((rel) => (
                  <Rel key={rel.source.treeId + rel.target.treeId} rel={rel} />
                ))}
                {root &&
                  root.spouses &&
                  root.spouses.map((target) => {
                    return (
                      <Rel
                        key={"root" + target.treeId}
                        rel={{ source: root, target }}
                      />
                    );
                  })}
                {root &&
                  root.siblings &&
                  root.siblings.map((target) => (
                    <Rel
                      key={"root" + target.treeId}
                      rel={{ source: root, target }}
                    />
                  ))}
              </g>
            </g>
          </svg>
          <div style={containerStyle}>
            <div
              style={{
                position: "absolute",
                left: containerStyle.width / 2,
                top: containerStyle.height / 2,
              }}
            >
              <div className="nodes">
                {root &&
                  root.siblings &&
                  root.siblings.map((node) => (
                    <Node
                      key={node.treeId}
                      node={node}
                      setFocusedNode={setFocusedNode}
                      focusedNode={focusedNode}
                    />
                  ))}
                {root && (
                  <Node
                    currentProp={currentProp}
                    toggleChildren={() => {
                      centerPoint(0, 0);
                      toggleChildren(childTree);
                    }}
                    toggleParents={() => {
                      centerPoint(0, 0);
                      toggleParents(parentTree);
                    }}
                    toggleSpouses={() => {
                      centerPoint(0);
                      toggleRootSpouses();
                    }}
                    toggleSiblings={() => {
                      centerPoint(0);
                      toggleRootSiblings();
                    }}
                    node={root}
                    setFocusedNode={setFocusedNode}
                    focusedNode={focusedNode}
                  />
                )}
                {root &&
                  root.spouses &&
                  root.spouses.map((node) => (
                    <Node
                      key={node.treeId}
                      node={node}
                      setFocusedNode={setFocusedNode}
                      focusedNode={focusedNode}
                    />
                  ))}
                {childNodes.map((node, index) => (
                  <Node
                    index={index}
                    key={node.treeId}
                    currentProp={currentProp}
                    toggleChildren={(node) => {
                      centerPoint(node.x, node.y);
                      toggleChildren(node);
                    }}
                    toggleSpouses={(node) => {
                      centerPoint(node.x);
                      toggleSpouses(node);
                    }}
                    toggleSiblings={(node) => {
                      centerPoint(node.x);
                      toggleSiblings(node);
                    }}
                    node={node}
                    setFocusedNode={setFocusedNode}
                    focusedNode={focusedNode}
                  />
                ))}
                {parentNodes.map((node, index) => (
                  <Node
                    key={node.treeId}
                    index={index}
                    //debug
                    currentProp={currentProp}
                    showMoreRightParents={showMoreRightParents}
                    showMoreLeftParents={showMoreLeftParents}
                    toggleSpouses={(node) => {
                      centerPoint(node.x);
                      toggleSpouses(node);
                    }}
                    toggleSiblings={(node) => {
                      centerPoint(node.x);
                      toggleSiblings(node);
                    }}
                    toggleParents={(node) => {
                      toggleParents(node);
                      centerPoint(node.x, node.y);
                    }}
                    node={node}
                    setFocusedNode={setFocusedNode}
                    focusedNode={focusedNode}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </TransformComponent>
      <div className="navigation">
        <Button variant="light" onClick={zoomIn}>
          <FiPlus />
        </Button>
        <Button variant="light" onClick={zoomOut}>
          <FiMinus />
        </Button>
        <Button
          variant="light"
          onClick={() => {
            centerPoint(focusedNode.x, focusedNode.y);
          }}
        >
          <RiFocus3Line />
        </Button>
        <Button
          variant="light"
          onClick={() => {
            fitTree(setTransform);
          }}
        >
          <IoMdExpand />
        </Button>
        <Button variant="light" onClick={window.print}>
          <FiPrinter />
        </Button>
      </div>
    </div>
  );
}

export default function GraphWrapper({ currentEntity, currentProp }) {
  return (
    <div className="GraphWrapper">
      <TransformWrapper
        zoomIn={{ step: 20 }}
        zoomOut={{ step: 20 }}
        wheel={{ step: 25 }}
        options={{
          limitToBounds: false,
          minScale: 0,
          maxScale: 2,
        }}
      >
        {(props) => (
          <Graph
            {...props}
            currentEntity={currentEntity}
            currentProp={currentProp}
          />
        )}
      </TransformWrapper>
    </div>
  );
}
