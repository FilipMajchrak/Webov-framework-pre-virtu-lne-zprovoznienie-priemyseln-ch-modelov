window.evalExpr = function (expr, variables)
{
    // Ošetrenie stringu v úvodzovkách
    if (/^".*"$/.test(expr.trim()))
    {
        return expr.trim().slice(1, -1);
    }

    // Priame true/false vrátenie
    if (/^(TRUE|true)$/.test(expr.trim())) return true;
    if (/^(FALSE|false)$/.test(expr.trim())) return false;

    try
    {
        const args = Object.keys(variables);
        const vals = Object.values(variables);

        const func = new Function(...args, `return (${expr});`);
        return func(...vals);
    }
    catch (e)
    {
        console.warn('Chyba vyhodnotenia výrazu:', e, 'vo výraze:', expr);
        return NaN;
    }
};

window.runST = function (code, inputGlobals = {})
{
    const lines = code.trim().split('\n');
    let inVar = false;
    let inGlobalVar = false;

    const variables = {};
    const globalVariables = inputGlobals;

    let executing = true;
    let ifStack = [];

    let inCase = false;
    let caseValue = null;
    let caseMatched = false;
    let caseFound = false;

    for (let i = 0; i < lines.length; i++)
    {
        let line = lines[i].trim();

        if (line === "VAR")
        {
            inVar = true;
            continue;
        }
        if (line === "VAR_GLOBAL")
        {
            inGlobalVar = true;
            continue;
        }
        if (line === "END_VAR")
        {
            inVar = false;
            inGlobalVar = false;
            continue;
        }

        if (line.startsWith("IF ") && line.endsWith("THEN"))
        {
            const condition = line.slice(3, -4).trim();
            const result = evalExpr(condition, { ...variables, ...globalVariables });
            ifStack.push(result);
            executing = result;
            continue;
        }

        if (line === "ELSE" && !inCase)
        {
            if (ifStack.length > 0)
            {
                executing = !ifStack[ifStack.length - 1];
            }
            continue;
        }

        if (line === "END_IF")
        {
            ifStack.pop();
            executing = ifStack.length === 0 || ifStack[ifStack.length - 1];
            continue;
        }

        if (line.startsWith("CASE ") && line.includes("OF"))
        {
            const expr = line.slice(5, line.indexOf("OF")).trim();
            caseValue = evalExpr(expr, { ...variables, ...globalVariables });
            inCase = true;
            caseMatched = false;
            caseFound = false;
            continue;
        }

        if (inCase && line.match(/^\d+\s*:/))
        {
            const [valStr, ...rest] = line.split(':');
            const val = parseInt(valStr.trim());

            if (caseValue === val)
            {
                caseMatched = true;
                caseFound = true;
            }
            else
            {
                caseMatched = false;
            }

            if (caseMatched && rest.length > 0)
            {
                const assignment = rest.join(':').trim();
                const match = assignment.match(/(\w+)\s*:=\s*(.+);?/);
                if (match)
                {
                    const [, name, expr] = match;
                    const cleanExpr = expr.replace(/;$/, '').trim();
                    const evaluated = evalExpr(cleanExpr, { ...variables, ...globalVariables });
                    if (globalVariables.hasOwnProperty(name))
                    {
                        globalVariables[name] = evaluated;
                    }
                    else
                    {
                        variables[name] = evaluated;
                    }
                }
            }
            continue;
        }

        if (inCase && line.startsWith("ELSE"))
        {
            if (!caseFound)
            {
                caseMatched = true;
                caseFound = true;
            }
            else
            {
                caseMatched = false;
            }

            const rest = line.slice(4).trim();
            if (caseMatched && rest)
            {
                const match = rest.match(/(\w+)\s*:=\s*(.+);?/);
                if (match)
                {
                    const [, name, expr] = match;
                    const cleanExpr = expr.replace(/;$/, '').trim();
                    const evaluated = evalExpr(cleanExpr, { ...variables, ...globalVariables });
                    if (globalVariables.hasOwnProperty(name))
                    {
                        globalVariables[name] = evaluated;
                    }
                    else
                    {
                        variables[name] = evaluated;
                    }
                }
            }
            continue;
        }

        if (inCase && caseMatched && line.match(/^\w+\s*:=/))
        {
            const match = line.match(/(\w+)\s*:=\s*(.+);/);
            if (match)
            {
                const [, name, expr] = match;
                const cleanExpr = expr.replace(/;$/, '').trim();
                const evaluated = evalExpr(cleanExpr, { ...variables, ...globalVariables });
                if (globalVariables.hasOwnProperty(name))
                {
                    globalVariables[name] = evaluated;
                }
                else
                {
                    variables[name] = evaluated;
                }
            }
            continue;
        }

        if (inCase && line === "END_CASE")
        {
            inCase = false;
            caseValue = null;
            caseMatched = false;
            continue;
        }

        if ((inVar || inGlobalVar) && executing)
        {
            const match = line.match(/(\w+)\s*:\s*(\w+)\s*(?::=)?\s*([^;]*)?;/);
            if (match)
            {
                const [, name, type, rawValue] = match;
                let val = 0;

                switch (type.toUpperCase())
                {
                    case "INT":
                    case "WORD":
                        val = parseInt(rawValue) || 0;
                        break;
                    case "REAL":
                        val = parseFloat(rawValue) || 0.0;
                        break;
                    case "BOOL":
                        val = rawValue?.toUpperCase() === "TRUE";
                        break;
                    case "STRING":
                        val = rawValue ? rawValue.replace(/^"|"$/g, '') : "";
                        break;
                    default:
                        val = 0;
                }

                if (inVar)
                {
                    variables[name] = val;
                }
                else if (inGlobalVar && !globalVariables.hasOwnProperty(name))
                {
                    globalVariables[name] = val;
                }
            }
        }
        else if (!inCase && executing)
        {
            const match = line.match(/(\w+)\s*:=\s*(.+);/);
            if (match)
            {
                const [, name, expr] = match;
                const cleanExpr = expr.replace(/;$/, '').trim();
                const evaluated = evalExpr(cleanExpr, { ...variables, ...globalVariables });
                if (globalVariables.hasOwnProperty(name))
                {
                    globalVariables[name] = evaluated;
                }
                else
                {
                    variables[name] = evaluated;
                }
            }
        }
    }

    return { variables, globalVariables };
};